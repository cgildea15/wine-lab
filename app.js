// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2GxSOi1McA7frSXuiq66igVrAqB7kPqo",
  authDomain: "winelab-c2f76.firebaseapp.com",
  projectId: "winelab-c2f76",
  storageBucket: "winelab-c2f76.firebasestorage.app",
  messagingSenderId: "625162326304",
  appId: "1:625162326304:web:e53604a064dca64d6d0745"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const wineForm = document.getElementById('wine-form');
    const colleenDisplay = document.getElementById('colleen-score');
    const daveDisplay = document.getElementById('dave-score');
    const feedbackSection = document.getElementById('feedback-section');
    const saveButton = document.getElementById('save-rating');

    let currentPredictionId = null; 

    // PHASE 1: PREDICTION
    wineForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const label = document.getElementById('labelName').value;
        const abv = parseFloat(document.getElementById('abv').value) || 0;
        const region = document.getElementById('region').value.toLowerCase();
        const price = parseFloat(document.getElementById('price').value) || 0;

        // "Brain" Logic
        let colleenScore = 7.0; 
        let daveScore = 7.0;
        let notes = [];

        if (abv > 14.2) { 
            colleenScore -= 1.0; 
            notes.push("🔥 High ABV: Watch for 'burn'."); 
        }
        if (region.includes('chile') || region.includes('italy')) {
            colleenScore += 1.0;
            notes.push("🌊 Expecting mineral/saline notes.");
        }
        if (price > 0 && price < 15.00) {
            notes.push("💸 Value check: Potentially high utility!");
        }

        // Show scores on screen immediately
        colleenDisplay.innerHTML = `<h3>Colleen's Prediction: ${colleenScore.toFixed(1)}</h3>`;
        daveDisplay.innerHTML = `<h3>Dave's Prediction: ${daveScore.toFixed(1)}</h3><p>${notes.join('<br>')}</p>`;
        feedbackSection.style.display = "block"; 

        // Save to Firebase in background
        try {
            const docRef = await db.collection("wine_history").add({
                label, abv, region, price,
                predictedColleen: colleenScore,
                predictedDave: daveScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentPredictionId = docRef.id;
        } catch (error) {
            console.error("Firebase Sync Error: ", error);
        }
    });

    // PHASE 2: UNIFIED FEEDBACK
    saveButton.addEventListener('click', async () => {
        const wasOaky = document.getElementById('actualOaky').checked;
        const buyAgain = document.getElementById('buyAgain').checked;
        const finalRating = parseFloat(document.getElementById('actual-rating').value);

        if (currentPredictionId && !isNaN(finalRating)) {
            try {
                await db.collection("wine_history").doc(currentPredictionId).update({
                    actualRating: finalRating,
                    wasOaky: wasOaky,
                    buyAgain: buyAgain
                });
                
                alert("Lab History Updated! Sharing this data with the family.");
                feedbackSection.style.display = "none";
                wineForm.reset();
                window.scrollTo(0, 0); // Reset view to top
            } catch (err) {
                console.error("Update Error: ", err);
            }
        } else {
            alert("Please enter a rating from 1-10!");
        }
    });
});
