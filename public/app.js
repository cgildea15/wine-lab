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
            let cScore = 7.0; 
            let dScore = 7.0;

            // 1. COLLEEN'S LOGIC
            const oldWorldKeywords = ['mineral', 'minerals', 'saline', 'tobacco', 'earthy', 'tannins', 'tannic', 'stone'];
            const subtleFruits = ['cherry', 'raspberry', 'citrus', 'apple', 'strawberry', 'watermelon'];
            if (oldWorldKeywords.some(note => notesList.includes(note))) cScore += 1.5;
            if (notesList.some(note => subtleFruits.includes(note))) cScore += 1.0;
            if (sweetness === 'dry') cScore += 0.5;

            // 2. DAVE'S LOGIC
            if (notesList.some(note => ['apple', 'juice', 'fruity'].includes(note))) dScore += 1.5;
            if (notesList.includes('smooth')) dScore += 1.0;
            if (temp === 'chilled') dScore += 0.5;
            if (regionList.some(r => r.includes("Italy") || r.includes("Portugal"))) dScore += 0.7;
            if (notesList.some(note => ['smoke', 'tobacco', 'tannic', 'earthy'].includes(note))) dScore -= 2.0;

            // 3. THE BUBBLE PENALTY
            if (style.toLowerCase().includes('sparkling') || notesList.includes('bubbles')) dScore -= 4.5;

            // 4. PRICE & VALUE LOGIC (NEW CEILING & CONTEXT PENALTIES)
            let priceCeiling = 10.0;
            if (price > 0 && price < 10) priceCeiling = 8.0;
            else if (price >= 10 && price < 20) priceCeiling = 9.0;

            // Contextual Penalty: Lower scores for "low-effort" pairings
            const lowEffortPairings = ['popcorn', 'no food', 'chips', 'potato chips'];
            if (foodList.some(food => lowEffortPairings.includes(food))) {
                cScore -= 1.0;
                dScore -= 1.0;
            }

            // Apply Ceiling and Value Modifiers
            let valueMod = (purchaseLocation === 'retail' && price <= 20) || (purchaseLocation === 'restaurant' && price <= 10) ? 1.0 : -1.0;
            cScore += valueMod;
            dScore += valueMod;

            // Apply Hard Ceiling
            cScore = Math.min(cScore, priceCeiling);
            dScore = Math.min(dScore, priceCeiling);

            // Final Bounds
            cScore = Math.max(0, cScore).toFixed(1);
            dScore = Math.max(0, dScore).toFixed(1);

            // Save to Firebase
            const docRef = await db.collection("wine_history").add({
                label, purchaseLocation, style, vintage, abv, price, temp, setting, sweetness,
                region: regionList, tastingNotes: notesList, foodPairing: foodList,
                predictedColleen: parseFloat(cScore), predictedDave: parseFloat(dScore),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            currentPredictionId = docRef.id;
            document.getElementById('c-score-val').innerText = cScore;
            document.getElementById('d-score-val').innerText = dScore;
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
            location.reload(); // Cleanest way to reset the app state
        } else {
            alert("Enter a rating before saving!");
        }
    });
});