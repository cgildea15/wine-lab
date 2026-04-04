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

document.addEventListener('DOMContentLoaded', () => {
    const wineForm = document.getElementById('wine-form');
    const colleenDisplay = document.getElementById('colleen-score');
    const daveDisplay = document.getElementById('dave-score');
    const feedbackSection = document.getElementById('feedback-section');
    const saveButton = document.getElementById('save-rating');

    let currentPredictionId = null; 

    // PHASE 1: PREDICTION (SHOPPING)
    wineForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const label = document.getElementById('labelName').value;
        const abv = parseFloat(document.getElementById('abv').value) || 0;
        const region = document.getElementById('region').value.toLowerCase();
        const style = document.getElementById('wineStyle').value.toLowerCase();
        const price = parseFloat(document.getElementById('price').value) || 0;

        // Base Logic
        let colleenScore = 7.5; 
        let daveScore = 7.5;
        let notes = [];

        // Simple Rules-Based AI
        if (abv > 14.2) { 
            colleenScore -= 1.0; 
            notes.push("🔥 High ABV: Watch for 'burn'."); 
        }
        if (region.includes('chile') || region.includes('sicily') || region.includes('italy')) {
            colleenScore += 1.0;
            notes.push("🌊 Expecting mineral/saline notes.");
        }
        if (price > 0 && price < 16) {
            notes.push("💸 Great value point.");
        }

        try {
            const docRef = await db.collection("wine_history").add({
                label, abv, region, style, price,
                predictedColleen: colleenScore,
                predictedDave: daveScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentPredictionId = docRef.id;
            
            colleenDisplay.innerHTML = `<h3>Colleen's Prediction: ${colleenScore.toFixed(1)}</h3>`;
            daveDisplay.innerHTML = `<h3>Dave's Prediction: ${daveScore.toFixed(1)}</h3><p>${notes.join('<br>')}</p>`;
            feedbackSection.style.display = "block"; 
            
        } catch (error) {
            console.error("Firebase Error: ", error);
        }
    });

    // PHASE 2: FEEDBACK (TASTING)
    saveButton.addEventListener('click', async () => {
        const wasOaky = document.getElementById('actualOaky').checked;
        const buyAgain = document.getElementById('buyAgain').checked;
        const realColleen = parseFloat(document.getElementById('actual-colleen').value);
        const realDave = parseFloat(document.getElementById('actual-dave').value);

        if (currentPredictionId && !isNaN(realColleen) && !isNaN(realDave)) {
            await db.collection("wine_history").doc(currentPredictionId).update({
                actualColleen: realColleen,
                actualDave: realDave,
                wasOaky: wasOaky,
                buyAgain: buyAgain
            });
            
            alert("History updated! Database is refining.");
            feedbackSection.style.display = "none";
            wineForm.reset();
        } else {
            alert("Please enter actual ratings for both!");
        }
    });
});
