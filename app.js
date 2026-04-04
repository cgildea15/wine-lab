// 1. Firebase Configuration
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

    // PHASE 1: PREDICT & INITIAL SAVE
    wineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Prevent duplicate clicks
        predictBtn.disabled = true;
        predictBtn.innerText = "Saving to Lab...";

        const label = document.getElementById('labelName').value;
        const abv = parseFloat(document.getElementById('abv').value) || 0;
        const region = document.getElementById('region').value.toLowerCase();
        const price = parseFloat(document.getElementById('price').value) || 0;

        let colleenScore = 7.0; 
        let daveScore = 7.0;
        if (abv > 14.2) { colleenScore -= 1.0; }
        if (region.includes('chile') || region.includes('italy') || region.includes('verona') || region.includes('marche')) {
            colleenScore += 1.0;
        }

        try {
            const docRef = await db.collection("wine_history").add({
                label, abv, region, price,
                predictedColleen: colleenScore,
                predictedDave: daveScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentPredictionId = docRef.id;
            
            document.getElementById('colleen-score').innerHTML = `<h3>Colleen's Prediction: ${colleenScore.toFixed(1)}</h3>`;
            document.getElementById('dave-score').innerHTML = `<h3>Dave's Prediction: ${daveScore.toFixed(1)}</h3>`;
            
            // Pop-up Confirmation
            alert("Entry Created! You can now enter tasting notes below.");
            
            feedbackSection.style.display = "block"; 
            predictBtn.innerText = "Saved ✅";
        } catch (error) { 
            console.error("Firebase Error:", error);
            alert("Error saving wine: " + error.message);
            predictBtn.disabled = false;
            predictBtn.innerText = "Predict Our Scores";
        }
    });

    // PHASE 2: UPDATE WITH TASTING DATA
    saveButton.addEventListener('click', async () => {
        const finalRating = parseFloat(document.getElementById('actual-rating').value);
        const notes = document.getElementById('tastingNotes').value;
        const vibe = document.getElementById('flavorVibe').value;
        const buyAgain = document.getElementById('buyAgain').checked;
        const taster = document.getElementById('user-name').value || "Colleen";

        if (currentPredictionId && !isNaN(finalRating)) {
            saveButton.disabled = true;
            saveButton.innerText = "Updating...";

            try {
                await db.collection("wine_history").doc(currentPredictionId).update({
                    actualRating: finalRating,
                    tastingNotes: notes,
                    vibe: vibe,
                    buyAgain: buyAgain,
                    taster: taster,
                    wasOaky: document.getElementById('actualOaky').checked
                });
                
                alert("Lab History Updated Successfully! 🍷");
                
                feedbackSection.style.display = "none";
                wineForm.reset();
                predictBtn.disabled = false;
                predictBtn.innerText = "Predict Our Scores";
                saveButton.disabled = false;
                saveButton.innerText = "Confirm & Save to History";
            } catch (err) { 
                console.error("Update Error:", err);
                alert("Failed to update: " + err.message);
                saveButton.disabled = false;
            }
        } else {
            alert("Please enter a final rating (1-10) before saving!");
        }
    });

    // 3. THE LIVE CELLAR LISTENER
    db.collection("wine_history").orderBy("timestamp", "desc").limit(5).onSnapshot((snapshot) => {
        const list = document.getElementById('history-list');
        list.innerHTML = "";
        snapshot.forEach((doc) => {
            const w = doc.data();
            const card = document.createElement('div');
            card.style = "background:white; padding:15px; border-radius:8px; border-left: 5px solid #800020; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>${w.label}</strong>
                    <span style="color:#800020; font-weight:bold;">⭐ ${w.actualRating || 'TBD'}</span>
                </div>
                <div style="font-size:0.8rem; color:#666;">
                    ${w.taster ? 'By: ' + w.taster : ''} | ${w.tastingNotes ? '<i>"' + w.tastingNotes + '"</i>' : ''}
                </div>
            `;
            list.appendChild(card);
        });
    });
});
