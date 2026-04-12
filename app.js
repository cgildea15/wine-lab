// AI Wine Predictor - Main Logic
// Note: firebaseConfig is loaded from the external config.js file for security.

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let currentPredictionId = null;

// Helper function for Data Integrity: Capitalizes each word (e.g., "france" -> "France")
const formatIntegrity = (str) => {
    if (!str) return "";
    return str.trim().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
};

document.addEventListener('DOMContentLoaded', () => {
    const wineForm = document.getElementById('wine-form');
    const feedbackSection = document.getElementById('feedback-section');
    const saveButton = document.getElementById('save-rating');
    const predictBtn = document.getElementById('predict-btn');

    wineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        predictBtn.disabled = true;
        predictBtn.innerText = "Analyzing Context...";

        try {
            // Raw Inputs & Formatting
            const label = formatIntegrity(document.getElementById('labelName').value);
            const purchaseLocation = document.getElementById('purchaseLocation').value;
            const sweetness = document.getElementById('sweetness').value;
            const style = formatIntegrity(document.getElementById('wineStyle').value);
            
            const vintage = parseInt(document.getElementById('vintage').value) || 0;
            const abv = parseFloat(document.getElementById('abv').value) || 0;
            const price = parseFloat(document.getElementById('price').value) || 0;
            const temp = document.getElementById('temp').value;
            const setting = document.getElementById('setting').value;

            // List Processing
            const regionRaw = document.getElementById('region').value;
            const regionList = regionRaw.split(',').map(i => formatIntegrity(i)).filter(i => i !== "");
            
            const notesRaw = document.getElementById('predictNotes').value;
            const notesList = notesRaw.split(',').map(i => i.trim().toLowerCase()).filter(i => i !== "");
            
            const foodRaw = document.getElementById('foodPairing').value;
            const foodList = foodRaw.split(',').map(i => i.trim().toLowerCase()).filter(i => i !== "");

            // --- PALATE-SPECIFIC PREDICTION LOGIC ---
            let cScore = 7.0; // Colleen: Old World Crisp
            let dScore = 7.0; // Dave: Fruity & Smooth

            // 1. COLLEEN'S LOGIC (Old World, Mineral, Saline, Earthy)
            const oldWorldKeywords = ['mineral', 'minerals', 'saline', 'tobacco', 'earthy', 'tannins', 'tannic', 'stone'];
            const subtleFruits = ['cherry', 'raspberry', 'citrus', 'apple', 'strawberry', 'watermelon'];
            
            const hasOldWorldBase = oldWorldKeywords.some(note => notesList.includes(note));
            const hasSubtleFruit = subtleFruits.some(note => notesList.includes(note));

            if (hasOldWorldBase) cScore += 1.5;
            if (hasOldWorldBase && hasSubtleFruit) cScore += 1.0; 
            if (sweetness === 'dry') cScore += 0.5;
            if (style.toLowerCase().includes('orange')) cScore += 1.0;

            // 2. DAVE'S LOGIC (Fruit-Forward, Smooth, Cold)
            if (notesList.includes('apple') || notesList.includes('juice') || notesList.includes('fruity')) dScore += 1.5;
            if (notesList.includes('smooth')) dScore += 1.0;
            if (temp === 'chilled') dScore += 0.5; 
            if (regionList.some(r => r.includes("Italy") || r.includes("Portugal"))) dScore += 0.7;

            // 3. THE "DAVE DISLIKES" FILTER
            // Penalty for Earth/Tobacco
            if (notesList.includes('smoke') || notesList.includes('tobacco') || notesList.includes('tannic') || notesList.includes('earthy')) {
                dScore -= 2.0; 
            }

            // CRITICAL: THE BUBBLE PENALTY (Dave hates anything sparkly)
            const sparklingKeywords = ['sparkling', 'champagne', 'cava', 'prosecco', 'bubbles', 'bubbly', 'carbonated', 'effervescent', 'fizz'];
            const isSparkling = sparklingKeywords.some(keyword => 
                style.toLowerCase().includes(keyword) || notesList.includes(keyword)
            );

            if (isSparkling) {
                dScore -= 4.5; // Heavy hit to ensure Dave's score stays in the "Failure" zone
            }

            // 4. SWEETNESS & DESSERT OVERRIDES
            if (sweetness === 'off-dry') dScore += 1.0; // Dave's "Balanced" sweet spot
            
            if (sweetness === 'sweet') {
                cScore -= 1.5; 
                dScore += 0.5; 
            }

            if (sweetness === 'dessert') {
                // Warning zone for both
                cScore -= 3.0; 
                dScore -= 3.0;
            }

            // Ensure scores stay within 0.0 - 10.0
            cScore = Math.max(0, Math.min(cScore, 10.0));
            dScore = Math.max(0, Math.min(dScore, 10.0));

            // Save to Firebase
            const docRef = await db.collection("wine_history").add({
                label, purchaseLocation, style, vintage, abv, price, temp, setting, sweetness,
                region: regionList, tastingNotes: notesList, foodPairing: foodList,
                predictedColleen: cScore, predictedDave: dScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            currentPredictionId = docRef.id;

            // Display Results
            document.getElementById('c-score-val').innerText = cScore.toFixed(1);
            document.getElementById('d-score-val').innerText = dScore.toFixed(1);
            
            feedbackSection.style.display = "block";
            predictBtn.innerText = "Saved ✅";

        } catch (err) {
            console.error("Lab Error:", err);
            predictBtn.disabled = false;
            predictBtn.innerText = "Predict Our Scores";
            alert("Error in the lab! Check your connection.");
        }
    });

    saveButton.addEventListener('click', async () => {
        const rating = parseFloat(document.getElementById('actual-rating').value);
        const buyAgain = document.getElementById('buyAgain').checked;
        const tasterRaw = document.getElementById('user-name').value || "Colleen";
        
        if (currentPredictionId && !isNaN(rating)) {
            const tasterList = tasterRaw.split(',').map(i => formatIntegrity(i)).filter(i => i !== "");

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
            } catch (err) { console.error("Update Error:", err); }
        } else {
            alert("Enter a rating before saving!");
        }
    });

    // History Listener
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
