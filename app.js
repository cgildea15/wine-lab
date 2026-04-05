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
let currentPredictionId = null;

document.addEventListener('DOMContentLoaded', () => {
    const wineForm = document.getElementById('wine-form');
    const feedbackSection = document.getElementById('feedback-section');
    const saveButton = document.getElementById('save-rating');
    const predictBtn = document.getElementById('predict-btn');

    // PHASE 1: THE PREDICTION ENGINE
    wineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        predictBtn.disabled = true;
        predictBtn.innerText = "Analyzing Context...";

        // Collect Inputs
        const label = document.getElementById('labelName').value;
        const style = document.getElementById('wineStyle').value.toLowerCase();
        const vintage = parseInt(document.getElementById('vintage').value) || 0;
        const abv = parseFloat(document.getElementById('abv').value) || 0;
        const price = parseFloat(document.getElementById('price').value) || 0;
        const temp = document.getElementById('temp').value;
        const setting = document.getElementById('setting').value;
        const pairing = document.getElementById('pairing').value.toLowerCase();

        // AUTOMATION: Smart Region Splitter (Spain, Navarra -> ["spain", "navarra"])
        const regionRaw = document.getElementById('region').value;
        const regionList = regionRaw.split(',').map(item => item.trim().toLowerCase()).filter(item => item !== "");

        // Prediction Logic
        let cScore = 7.0; 
        let dScore = 7.0;

        // Colleen's Rules
        if (regionList.includes('italy') || regionList.includes('spain')) cScore += 1.0;
        if (style.includes('orange') || style.includes('saline')) cScore += 1.5;
        if (style.includes('bubbly') || style.includes('sparkling')) cScore += 1.0;
        if (abv > 14.2) cScore -= 1.5;

        // Dave's Rules
        if (style.includes('riesling') || style.includes('white')) {
            dScore += 1.0;
            if (temp === 'chilled' && setting === 'water') dScore += 1.0;
        }
        if (style.includes('amarone') || style.includes('valpolicella')) dScore += 2.0;
        if (style.includes('bubbly')) dScore -= 1.5;

        try {
            const docRef = await db.collection("wine_history").add({
                label, style, vintage, abv, price, 
                region: regionList, // Saved as List
                temp, setting, pairing,
                predictedColleen: cScore,
                predictedDave: dScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            currentPredictionId = docRef.id;

            // UI Feedback
            document.getElementById('c-score-val').innerText = cScore.toFixed(1);
            document.getElementById('d-score-val').innerText = dScore.toFixed(1);
            
            feedbackSection.style.display = "block";
            predictBtn.innerText = "Saved ✅";
            alert("Predictions Calculated & Logged!");

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
            predictBtn.disabled = false;
        }
    });

    // PHASE 2: TASTING UPDATES (WITH AUTOMATED LIST SPLITTING)
    saveButton.addEventListener('click', async () => {
        const rating = parseFloat(document.getElementById('actual-rating').value);
        
        if (currentPredictionId && !isNaN(rating)) {
            // AUTOMATION: Taster Splitter (Colleen, Dave -> ["Colleen", "Dave"])
            const tasterRaw = document.getElementById('user-name').value || "Colleen";
            const tasterList = tasterRaw.split(',').map(item => item.trim()).filter(item => item !== "");

            // AUTOMATION: Notes Splitter (Spice, Orange -> ["spice", "orange"])
            const notesRaw = document.getElementById('tastingNotes').value;
            const notesList = notesRaw.split(',').map(item => item.trim().toLowerCase()).filter(item => item !== "");

            try {
                await db.collection("wine_history").doc(currentPredictionId).update({
                    actualRating: rating,
                    tastingNotes: notesList, // Saved as List
                    taster: tasterList,       // Saved as List
                    wasOaky: document.getElementById('actualOaky').checked
                });
                
                alert("Lab History Updated! Entry is now searchable.");
                wineForm.reset();
                feedbackSection.style.display = "none";
