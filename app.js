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
        const abv = parseFloat(document.getElementById('abv').value) || 0;
        const region = document.getElementById('region').value.toLowerCase();
        const price = parseFloat(document.getElementById('price').value) || 0;
        const context = document.getElementById('purchaseContext').value;

        let colleenScore = 7.0; 
        if (context === 'restaurant' && price <= 12) colleenScore += 1.0;
        if (context === 'retail' && price <= 15) colleenScore += 0.5;
        if (abv > 14.2) colleenScore -= 1.0;
        if (region.includes('italy') || region.includes('chile')) colleenScore += 1.0;

        try {
            const docRef = await db.collection("wine_history").add({
                label, abv, region, price, context,
                predictedColleen: colleenScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentPredictionId = docRef.id;
            document.getElementById('colleen-score').innerHTML = `<h3>Colleen's Prediction: ${colleenScore.toFixed(1)}</h3>`;
            alert("Record Created! Add your tasting notes.");
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
                alert("History Updated!");
                feedbackSection.style.display = "none";
                wineForm.reset();
                predictBtn.disabled = false;
                predictBtn.innerText = "Predict Our Scores";
            } catch (err) { alert(err.message); }
        } else { alert("Enter a rating!"); }
    });

    db.collection("wine_history").orderBy("timestamp", "desc").limit(5).onSnapshot((snapshot) => {
        const list = document.getElementById('history-list');
        list.innerHTML = "";
        snapshot.forEach((doc) => {
            const w = doc.data();
            const icon = w.context === 'restaurant' ? '🍴' : '🏪';
            const card = document.createElement('div');
            card.style = "background:white; padding:15px; border-radius:8px; border-left: 5px solid #800020; margin-bottom:10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";
            card.innerHTML = `<div><strong>${w.label}</strong> <span style="float:right; color:#800020;">⭐ ${w.actualRating || 'TBD'}</span></div>
                              <div style="font-size:0.8rem; color:#666;">${icon} $${w.price} | ${w.taster || 'Colleen'}</div>
                              <div style="font-size:0.8rem; font-style:italic;">${w.tastingNotes || ''}</div>`;
            list.appendChild(card);
        });
    });
});
