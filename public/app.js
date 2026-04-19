import { collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const formatIntegrity = (str) => {
    if (!str) return "";
    return str.trim().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
};

const loadHistory = async () => {
    const historyList = document.getElementById('history-list');
    const q = query(collection(window.db, "wine_history"), orderBy("timestamp", "desc"), limit(5));
    const querySnapshot = await getDocs(q);
    historyList.innerHTML = "";
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `<div><strong>${data.label}</strong><br><small>${data.style}</small></div>
                          <div><strong>${data.actualRating || '-'}</strong></div>`;
        historyList.appendChild(card);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const wineForm = document.getElementById('wine-form');
    const predictBtn = document.getElementById('predict-btn');
    const finalLogBtn = document.getElementById('final-log-btn');
    let currentDocId = null; // Store ID for second-stage update

    loadHistory();

    // STAGE 1: PREDICTION
    wineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        predictBtn.disabled = true;
        predictBtn.innerText = "Analyzing...";

        const label = formatIntegrity(document.getElementById('labelName').value);
        const style = formatIntegrity(document.getElementById('wineStyle').value);
        const price = parseFloat(document.getElementById('price').value) || 0;
        const notesRaw = document.getElementById('predictNotes').value;
        const notesList = notesRaw.split(',').map(i => i.trim().toLowerCase()).filter(i => i !== "");

        // Refined Scoring Logic
        let oldWorldScore = 5.0; 
        let fruitScore = 5.0;
        const oldWorld = ['mineral', 'saline', 'acid', 'earthy', 'tobacco', 'smoke', 'tannin', 'tannic', 'fuzzy', 'citrus', 'lemon'];
        const fruitForward = ['vanilla', 'tropical', 'apple', 'berry', 'cherry'];

        if (notesList.some(n => oldWorld.includes(n))) { oldWorldScore += 2.0; fruitScore -= 1.5; }
        if (notesList.some(n => fruitForward.includes(n))) { fruitScore += 2.0; oldWorldScore -= 1.5; }

        let maxCap = (price < 10) ? 7.0 : (price < 20 ? 8.0 : 9.0);
        oldWorldScore = Math.min(Math.max(4.9, oldWorldScore), maxCap);
        fruitScore = Math.min(Math.max(4.9, fruitScore), maxCap);

        const docRef = await addDoc(collection(window.db, "wine_history"), {
            label, style, purchaseLocation: document.getElementById('purchaseLocation').value,
            sweetness: document.getElementById('sweetness').value,
            vintage: parseInt(document.getElementById('vintage').value),
            price,
            predictedCrisp: parseFloat(oldWorldScore.toFixed(1)),
            predictedSmooth: parseFloat(fruitScore.toFixed(1)),
            timestamp: new Date()
        });

        currentDocId = docRef.id;
        document.getElementById('c-score-val').innerText = oldWorldScore.toFixed(1);
        document.getElementById('d-score-val').innerText = fruitScore.toFixed(1);
        
        document.getElementById('results').style.display = "block";
        document.getElementById('feedback-stage').style.display = "block";
        document.getElementById('prediction-stage').style.display = "none";
    });

    // STAGE 2: FINAL LOG
    finalLogBtn.addEventListener('click', async () => {
        if (!currentDocId) return;
        await updateDoc(doc(window.db, "wine_history", currentDocId), {
            temp: document.getElementById('temp').value,
            setting: document.getElementById('setting').value,
            actualStyle: document.getElementById('actualStyle').value,
            actualRating: parseFloat(document.getElementById('actual-rating').value),
            buyAgain: document.getElementById('buyAgain').value === 'true'
        });
        alert("Discovery logged!");
        location.reload();
    });
});