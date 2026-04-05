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
        predictBtn.innerText = "Analyzing...";

        const label = document.getElementById('labelName').value;
        const style = document.getElementById('wineStyle').value.toLowerCase();
        const vintage = parseInt(document.getElementById('vintage').value) || 0;
        const abv = parseFloat(document.getElementById('abv').value) || 0;
        const temp = document.getElementById('temp').value;
        const setting = document.getElementById('setting').value;

        // Smart Splitters
        const regionRaw = document.getElementById('region').value;
        const regionList = regionRaw.split(',').map(i => i.trim().toLowerCase()).filter(i => i !== "");
        const notesRaw = document.getElementById('predictNotes').value;
        const notesList = notesRaw.split(',').map(i => i.trim().toLowerCase()).filter(i => i !== "");

        // Prediction Logic
        let cScore = 7.0; let dScore = 7.0;
        if (notesList.includes('minerals') || notesList.includes('saline')) cScore += 1.5;
        if (style.includes('orange')) cScore += 1.0;
        if (notesList.includes('oak') || notesList.includes('smoke')) dScore -= 1.5;

        try {
            const docRef = await db.collection("wine_history").add({
                label, style, vintage, abv, temp, setting,
                region: regionList, tastingNotes: notesList,
                predictedColleen: cScore, predictedDave: dScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentPredictionId = docRef.id;
            document.getElementById('c-score-val').innerText = cScore.toFixed(1);
            document.getElementById('d-score-val').innerText = dScore.toFixed(1);
            feedbackSection.style.display = "block";
            predictBtn.innerText = "Saved ✅";
        } catch (err) { alert(err.message); predictBtn.disabled = false; }
    });

    saveButton.addEventListener('click', async () => {
        const rating = parseFloat(document.getElementById('actual-rating').value);
        const buyAgain = document.getElementById('buyAgain').checked;
        
        if (currentPredictionId && !isNaN(rating)) {
            const tasterRaw = document.getElementById('user-name').value || "Colleen";
            const tasterList = tasterRaw.split(',').map(i => i.trim()).filter(i => i !== "");

            try {
                await db.collection("wine_history").doc(currentPredictionId).update({
                    actualRating: rating,
                    buyAgain: buyAgain,
                    taster: tasterList
                });
                alert("Lab History Updated!");
                wineForm.reset();
                feedbackSection.style.display = "none";
                predictBtn.disabled = false;
                predictBtn.innerText = "Predict Our Scores";
                document.getElementById('c-score-val').innerText = "--";
                document.getElementById('d-score-val').innerText = "--";
                document.getElementById('buyAgain').checked = false; // Reset toggle
            } catch (err) { alert(err.message); }
        }
    });

    db.collection("wine_history").orderBy("timestamp", "desc").limit(5).onSnapshot(snap => {
        const list = document.getElementById('history-list');
        list.innerHTML = "";
        snap.forEach(doc => {
            const w = doc.data();
            const div = document.createElement('div');
            div.className = "history-card";
            div.innerHTML = `<strong>${w.label}</strong> <span>⭐ ${w.actualRating || 'TBD'}</span>`;
            list.appendChild(div);
        });
    });
});
