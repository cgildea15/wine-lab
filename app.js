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

        // --- PREDICTION ENGINE START ---
        let cScore = 7.0; 
        let dScore = 7.0;

        // Colleen's "Old World & Sparkle" Model
        if (region.includes('italy') || region.includes('germany') || region.includes('europe') || region.includes('chile')) cScore += 1.0;
        if (style.includes('orange') || style.includes('spice')) cScore += 1.5;
        if (style.includes('bubbly') || style.includes('sparkling')) cScore += 1.0;
        if (abv > 14.2) cScore -= 1.5; // Colleen hates the heat

        // Dave's "Clean & Chilled" Model
        if (style.includes('riesling') || style.includes('white')) {
            dScore += 1.0;
            if (temp === 'chilled') dScore += 0.5;
            if (setting === 'water') dScore += 0.5;
        }
        if (style.includes('bubbly') || style.includes('sparkling')) dScore -= 1.5; // Dave says no bubbles
        
        // Dave's Amarone Exception
        if (style.includes('amarone') || style.includes('valpolicella')) {
            dScore += 2.0; 
        } else if (style.includes('cabernet') || style.includes('oaky')) {
            dScore -= 1.0; // Dave dislikes the "chew"
        }

        // --- PREDICTION ENGINE END ---

        try {
            const docRef = await db.collection("wine_history").add({
                label, style, abv, region, price, context, temp, setting, pairing,
                predictedColleen: cScore,
                predictedDave: dScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentPredictionId = docRef.id;
            
            document.getElementById('c-score-val').innerText = cScore.toFixed(1);
            document.getElementById('d-score-val').innerText = dScore.toFixed(1);
            
            alert("Predictions Calculated! Ready for the Lab report.");
            feedbackSection.style.display = "block";
            predictBtn.innerText = "Saved ✅";
        } catch (err) { alert(err.message); predictBtn.disabled = false; }
    });

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
                alert("History Logged. Cheers!");
                feedbackSection.style.display = "none";
                wineForm.reset();
                predictBtn.disabled = false;
                predictBtn.innerText = "Predict Our Scores";
            } catch (err) { alert(err.message); }
        } else { alert("Enter a rating!"); }
    });

    // History List Listener
    db.collection("wine_history").orderBy("timestamp", "desc").limit(5).onSnapshot((snapshot) => {
        const list = document.getElementById('history-list');
        list.innerHTML = "";
        snapshot.forEach((doc) => {
            const w = doc.data();
            const card = document.createElement('div');
            card.style = "background:white; padding:15px; border-radius:8px; border-left: 5px solid #800020; margin-bottom:10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>${w.label}</strong> 
                    <span style="color:#800020; font-weight:bold;">⭐ ${w.actualRating || 'TBD'}</span>
                </div>
                <div style="font-size:0.75rem; color:#666;">
                    Context: ${w.setting} | ${w.temp} | $${w.price}
                </div>
                <div style="font-size:0.8rem; font-style:italic; color: #444;">${w.tastingNotes || ''}</div>`;
            list.appendChild(card);
        });
    });
});
