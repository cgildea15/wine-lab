// REPLACE THIS with your actual config from Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const wineForm = document.getElementById('wine-form');
    const colleenDisplay = document.getElementById('colleen-score');
    const daveDisplay = document.getElementById('dave-score');

    wineForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Collect Data
        const wineData = {
            label: document.getElementById('labelName').value,
            style: document.getElementById('wineStyle').value,
            vintage: document.getElementById('vintage').value,
            abv: parseFloat(document.getElementById('abv').value) || 0,
            region: document.getElementById('region').value.toLowerCase(),
            isOaky: document.getElementById('isOaky').checked,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 2. Initial Prediction Logic (The "Starting Point")
        let colleenScore = 7.0;
        let daveScore = 7.0;
        let notes = [];

        if (wineData.isOaky) { daveScore -= 4.0; notes.push("⚠️ Smoky risk for Dave."); }
        if (wineData.abv > 14.2) { colleenScore -= 2.0; notes.push("🔥 High ABV burn risk."); }
        if (wineData.region.includes('sicily') || wineData.region.includes('coast')) { colleenScore += 1.5; }

        // 3. THE ADVANCED PART: "Refining Predictions"
        // Here, we save the prediction. Later, we'll add a 'Actual Rating' button
        // that updates this entry, allowing the app to learn your patterns.
        try {
            await db.collection("wine_history").add({
                ...wineData,
                predictedColleen: colleenScore,
                predictedDave: daveScore
            });
            console.log("Wine saved to history!");
        } catch (error) {
            console.error("Error saving to Firebase: ", error);
        }

        // 4. Display
        colleenDisplay.innerHTML = `<h3>Colleen: ${colleenScore.toFixed(1)}</h3>`;
        daveDisplay.innerHTML = `<h3>Dave: ${daveScore.toFixed(1)}</h3><p>${notes.join('<br>')}</p>`;
    });
});
