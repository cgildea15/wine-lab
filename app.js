// AI Wine Predictor - Main Logic
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let currentPredictionId = null;

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
    const buyAgainCheckbox = document.getElementById('buyAgain');

    wineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        predictBtn.disabled = true;
        predictBtn.innerText = "Analyzing Context...";

        try {
            const label = formatIntegrity(document.getElementById('labelName').value);
            const purchaseLocation = document.getElementById('purchaseLocation').value;
            const sweetness = document.getElementById('sweetness').value;
            const style = formatIntegrity(document.getElementById('wineStyle').value);
            const vintage = parseInt(document.getElementById('vintage').value) || 0;
            const abv = parseFloat(document.getElementById('abv').value) || 0;
            const price = parseFloat(document.getElementById('price').value) || 0;
            const temp = document.getElementById('temp').value;
            const setting = document.getElementById('setting').value;

            const regionRaw = document.getElementById('region').value;
            const regionList = regionRaw.split(',').map(i => formatIntegrity(i)).filter(i => i !== "");
            const notesRaw = document.getElementById('predictNotes').value;
            const notesList = notesRaw.split(',').map(i => i.trim().toLowerCase()).filter(i => i !== "");
            const foodRaw = document.getElementById('foodPairing').value;
            const foodList = foodRaw.split(',').map(i => i.trim().toLowerCase()).filter(i => i !== "");

            // --- PALATE-SPECIFIC PREDICTION LOGIC ---
            // 1. BASELINE: Start conservative at 5.0
            let cScore = 5.0; 
            let dScore = 5.0;

            // 2. PROFILE DETECTION
            const oldWorldKeywords = ['mineral', 'minerals', 'saline', 'tobacco', 'earthy', 'tannic', 'stone', 'petroleum'];
            const fruitForwardKeywords = ['apple', 'juice', 'fruity', 'cherry', 'pineapple', 'vanilla', 'tropical', 'red berry'];
            
            const isOldWorld = notesList.some(n => oldWorldKeywords.includes(n));
            const isFruitForward = notesList.some(n => fruitForwardKeywords.includes(n));

            // 3. MUTUALLY EXCLUSIVE LOGIC PATHS
            if (isOldWorld) {
                cScore += 2.5; // Colleen's preferred profile
                dScore -= 1.0; // Dave finds these less accessible
            } else if (isFruitForward) {
                dScore += 2.5; // Dave's preferred profile
                cScore -= 1.0; // Colleen finds these less interesting
            }

            // 4. REGION & ORIGIN BOOSTS
            const isEurope = regionList.some(r => ['Italy', 'France', 'Portugal', 'Spain', 'Germany'].includes(r));
            if (isEurope) cScore += 0.5;

            // 5. PRICE & UNICORN GUARDRAILS (Strict)
            let priceCeiling = 10.0;
            if (price < 10) {
                priceCeiling = 5.5; // Absolute max for a sub-$10 bottle
                cScore -= 1.0;
                dScore -= 1.0;
            } else if (price >= 10 && price < 20) {
                priceCeiling = 8.0; // Mid-range cap
            } else if (price >= 20 && price < 50) {
                priceCeiling = 9.0;
            } else {
                priceCeiling = 9.5; // True unicorns are rare
            }

            // 6. CONTEXTUAL PENALTY
            const lowEffort = ['popcorn', 'no food', 'chips', 'potato chips', 'gas station'];
            if (foodList.some(f => lowEffort.includes(f))) {
                cScore -= 1.5;
                dScore -= 1.5;
            }

            // Apply Ceilings and Bounds
            cScore = Math.min(Math.max(0, cScore), priceCeiling);
            dScore = Math.min(Math.max(0, dScore), priceCeiling);

            // Save to Firebase
            const docRef = await db.collection("wine_history").add({
                label, purchaseLocation, style, vintage, abv, price, temp, setting, sweetness,
                region: regionList, tastingNotes: notesList, foodPairing: foodList,
                predictedColleen: parseFloat(cScore.toFixed(1)), 
                predictedDave: parseFloat(dScore.toFixed(1)),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            currentPredictionId = docRef.id;
            document.getElementById('c-score-val').innerText = cScore.toFixed(1);
            document.getElementById('d-score-val').innerText = dScore.toFixed(1);
            feedbackSection.style.display = "block";
            predictBtn.innerText = "Saved ✅";
        } catch (err) {
            console.error("Lab Error:", err);
            predictBtn.disabled = false;
            predictBtn.innerText = "Predict Our Scores";
            alert("Error in the lab!");
        }
    });

    saveButton.addEventListener('click', async () => {
        const rating = parseFloat(document.getElementById('actual-rating').value);
        const buyAgain = buyAgainCheckbox.checked;
        const tasterRaw = document.getElementById('user-name').value || "Colleen";
        
        if (currentPredictionId && !isNaN(rating)) {
            const tasterList = tasterRaw.split(',').map(i => formatIntegrity(i)).filter(i => i !== "");
            await db.collection("wine_history").doc(currentPredictionId).update({
                actualRating: rating, buyAgain, taster: tasterList
            });
            alert("Lab History Updated!");
            location.reload(); 
        } else {
            alert("Enter a rating before saving!");
        }
    });
});