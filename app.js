const firebaseConfig = {
  apiKey: "AIzaSyA2GxSOi1McA7frSXuiq66igVrAqB7kPqo",
  authDomain: "winelab-c2f76.firebaseapp.com",
  projectId: "winelab-c2f76",
  storageBucket: "winelab-c2f76.firebasestorage.app",
  messagingSenderId: "625162326304",
  appId: "1:625162326304:web:e53604a064dca64d6d0745"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let currentPredictionId = null; 

document.addEventListener('DOMContentLoaded', () => {
    const wineForm = document.getElementById('wine-form');
    const feedbackSection = document.getElementById('feedback-section');
    const saveButton = document.getElementById('save-rating');
    const predictBtn = document.getElementById('predict-btn');

    // 1. PREDICT & INITIAL SAVE
    wineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        predictBtn.disabled = true;
        predictBtn.innerText = "Analyzing Context...";

        const label = document.getElementById('labelName').value;
        const style = document.getElementById('wineStyle').value.toLowerCase();
        const abv = parseFloat(document.getElementById('abv').value) || 0;
        const region = document.getElementById('region').value.toLowerCase();
        const price = parseFloat(document.getElementById('price').value) || 0;
        const context = document.getElementById('purchaseContext').value;
        const temp = document.getElementById('temp').value;
        const setting = document.getElementById('setting').value;
        const pairing = document.getElementById('pairing').value.toLowerCase();

        // THE PREDICTION LOGIC
        let cScore = 7.0; 
        let dScore = 7.0;

        // Colleen's Weights
        if (region.includes('italy') || region.includes('germany') || region.includes('europe') || region.includes('chile')) cScore += 1.0;
        if (style.includes('orange') || style.includes('spice')) cScore += 1.5;
        if (style.includes('bubbly') || style.includes('sparkling')) cScore += 1.0;
        if (abv > 14.2) cScore -= 1.5; 

        // Dave's Weights
        if (style.includes('riesling') || style.includes('white')) {
            dScore += 1.0;
            if (temp === 'chilled') dScore += 0.5;
            if (setting === 'water') dScore += 0.5;
        }
        if (style.includes('bubbly') || style.includes('sparkling')) dScore -= 1.5; 
        
        if (style.includes('amarone') || style.includes('valpolicella')) {
            dScore += 2.0; 
        } else if (style.includes('cabernet') || style.includes('oaky')) {
            dScore -= 1.0; 
        }

        try {
            const docRef = await db.collection("wine_history").add({
                label, style, abv, region, price, context, temp, setting, pairing,
                predictedColleen: cScore,
                predictedDave: dScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentPredictionId = docRef.id;
            
            // Push values to UI
            document.getElementById('c-score-val').innerText = cScore.toFixed(1);
            document.getElementById('d-score-val').innerText = dScore.toFixed(1);
            
            alert("Entry Created in Firestore! Check out the predictions.");
            feedbackSection.style.display = "block";
            predictBtn.innerText = "Saved ✅";
        } catch (err) { 
            console.error(err);
            alert("Error communicating with Firestore: " + err.message);
            predictBtn.disabled = false;
        }
    });

    // 2. ACTUAL RATING UPDATE
    saveButton.addEventListener('click', async () => {
        const finalRating = parseFloat(document.getElementById('actual-rating').value);
        if (currentPredictionId && !isNaN(finalRating)) {
            try {
                await db.collection("wine_history").doc(currentPredictionId).update({
                    actualRating: finalRating,
                    tastingNotes: document.getElementById('tastingNotes').value,
                    vibe: document.getElementById('flavorVibe').value,
                    buyAgain: document.getElementById('buyAgain').checked,
                    taster: document.getElementById('user-name').value || "Colleen",
                    wasOaky: document.getElementById('actualOaky').checked
                });
                alert("History Updated! Lab report complete.");
                feedbackSection.style.display = "none";
                wineForm.reset();
                predictBtn.disabled = false;
                predictBtn.innerText = "Predict Our Scores";
                document.getElementById('c-score-val').innerText = "--";
                document.getElementById('d-score-val').innerText = "--";
            } catch (err) { alert(err.message); }
        } else { alert("Please enter your final rating first!"); }
    });

    // 3. LIVE CELLAR LISTENER
    db.collection("wine_history").orderBy("timestamp", "desc").limit(5).onSnapshot((snapshot) => {
        const list = document.getElementById('history-list');
        list.innerHTML = "";
        snapshot.forEach((doc) => {
            const w = doc.data();
            const icon = w.context === 'restaurant' ? '🍴' : '🏪';
            const card = document.createElement('div');
            card.style = "background:white; padding:15px; border-radius:8px; border-left: 5px solid #800020; margin-bottom:10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>${w.label}</strong> 
                    <span style="color:#800020; font-weight:bold;">⭐ ${w.actualRating || 'TBD'}</span>
                </div>
                <div style="font-size:0.75rem; color:#666;">
                    ${icon} $${w.price} | Tasted by: ${w.taster || 'Unknown'}
                </div>
            `;
            list.appendChild(card);
        });
    });
});
