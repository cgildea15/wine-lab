import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const formatIntegrity = (str) => {
    if (!str) return "";
    return str.trim().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
};

document.addEventListener('DOMContentLoaded', () => {
    const wineForm = document.getElementById('wine-form');
    const predictBtn = document.getElementById('predict-btn');

    wineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        predictBtn.disabled = true;
        predictBtn.innerText = "Analyzing & Logging...";

        try {
            // 1. Gather all inputs
            const label = formatIntegrity(document.getElementById('labelName').value);
            const purchaseLocation = document.getElementById('purchaseLocation').value;
            const sweetness = document.getElementById('sweetness').value;
            const style = formatIntegrity(document.getElementById('wineStyle').value);
            const vintage = parseInt(document.getElementById('vintage').value) || 0;
            const price = parseFloat(document.getElementById('price').value) || 0;
            const notesRaw = document.getElementById('predictNotes').value;
            
            // New Integrated fields
            const actualRating = parseFloat(document.getElementById('actual-rating').value) || null;
            const buyAgain = document.getElementById('buyAgain').value === 'true';

            const notesList = notesRaw.split(',').map(i => i.trim().toLowerCase()).filter(i => i !== "");

            // 2. Prediction Logic
            let cScore = 5.0; 
            let dScore = 5.0;
            const oldWorldKeywords = ['mineral', 'saline', 'earthy', 'tannic', 'stone'];
            const fruitForwardKeywords = ['apple', 'fruity', 'cherry', 'pineapple', 'vanilla'];
            
            if (notesList.some(n => oldWorldKeywords.includes(n))) {
                cScore += 2.5; dScore -= 1.0;
            } else if (notesList.some(n => fruitForwardKeywords.includes(n))) {
                dScore += 2.5; cScore -= 1.0;
            }

            // 3. Save to Firebase (Single Step)
            await addDoc(collection(window.db, "wine_history"), {
                label, purchaseLocation, style, vintage, price, sweetness,
                tastingNotes: notesList,
                actualRating: actualRating,
                buyAgain: buyAgain,
                predictedColleen: parseFloat(cScore.toFixed(1)), 
                predictedDave: parseFloat(dScore.toFixed(1)),
                timestamp: new Date()
            });

            // 4. Update UI
            document.getElementById('c-score-val').innerText = cScore.toFixed(1);
            document.getElementById('d-score-val').innerText = dScore.toFixed(1);
            
            // Show the results section
            document.getElementById('results').style.display = "block";
            predictBtn.innerText = "Logged to Lab ✅";
            
            alert("Prediction saved to your lab!");

        } catch (err) {
            console.error("Lab Error:", err);
            predictBtn.disabled = false;
            predictBtn.innerText = "Predict & Log Rating";
            alert("Error in the lab! Check your console.");
        }
    });
});