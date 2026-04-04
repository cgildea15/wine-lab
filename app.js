// 1. Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2GxSOi1McA7frSXuiq66igVrAqB7kPqo",
  authDomain: "winelab-c2f76.firebaseapp.com",
  projectId: "winelab-c2f76",
  storageBucket: "winelab-c2f76.firebasestorage.app",
  messagingSenderId: "625162326304",
  appId: "1:625162326304:web:e53604a064dca64d6d0745"
};

// 2. Initialize Firebase using the "compat" version
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const wineForm = document.getElementById('wine-form');
    const colleenDisplay = document.getElementById('colleen-score');
    const daveDisplay = document.getElementById('dave-score');
    const feedbackSection = document.getElementById('feedback-section');
    const saveButton = document.getElementById('save-rating');

    let currentPredictionId = null; // To track the wine we just added

    wineForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Collect inputs
        const label = document.getElementById('labelName').value;
        const abv = parseFloat(document.getElementById('abv').value) || 0;
        const isOaky = document.getElementById('isOaky').checked;
        const region = document.getElementById('region').value.toLowerCase();
        const style = document.getElementById('wineStyle').value.toLowerCase();

        // Initial Logic (The "Guess")
        let colleenScore = 7.0;
        let daveScore = 7.0;
        let notes = [];

        if (isOaky) { daveScore -= 4.0; notes.push("⚠️ Smoky risk for Dave."); }
        if (abv > 14.2) { colleenScore -= 2.0; notes.push("🔥 High ABV burn risk."); }
        if (region.includes('sicily') || region.includes('coast') || region.includes('chile')) { colleenScore += 1.5; }

        // Save the "Prediction" to Firebase
        try {
            const docRef = await db.collection("wine_history").add({
                label, abv, isOaky, region, style,
                predictedColleen: colleenScore,
                predictedDave: daveScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentPredictionId = docRef.id; // Store ID for the "Actual Rating" update
            
            // Show the results and the feedback section
            colleenDisplay.innerHTML = `<h3>Colleen: ${colleenScore.toFixed(1)}</h3>`;
            daveDisplay.innerHTML = `<h3>Dave: ${daveScore.toFixed(1)}</h3><p>${notes.join('<br>')}</p>`;
            feedbackSection.style.display = "block"; 
            
        } catch (error) {
            console.error("Firebase Error: ", error);
            alert("Check your Firebase 'Test Mode' settings!");
        }
    });

    // 3. The "Learning" Function: Save Actual Ratings
    saveButton.addEventListener('click', async () => {
        const actualColleen = parseFloat(document.getElementById('actual-colleen').value);
        const actualDave = parseFloat(document.getElementById('actual-dave').value);

        if (currentPredictionId && actualColleen && actualDave) {
            await db.collection("wine_history").doc(currentPredictionId).update({
                actualColleen,
                actualDave
            });
            alert("Rating saved! Your app is officially learning.");
            feedbackSection.style.display = "none";
            wineForm.reset();
        } else {
            alert("Please enter ratings for both of you!");
        }
    });
});
