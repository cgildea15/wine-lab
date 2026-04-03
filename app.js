// 1. Wait for the HTML to fully load
document.addEventListener('DOMContentLoaded', () => {
    const wineForm = document.getElementById('wine-form');
    const colleenDisplay = document.getElementById('colleen-score');
    const boyfriendDisplay = document.getElementById('boyfriend-score');

    // 2. Listen for the "Predict" button click
    wineForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Stop the page from refreshing

        // 3. Grab the values from the inputs
        const grape = document.getElementById('grape').value.toLowerCase();
        const region = document.getElementById('region').value.toLowerCase();

        // 4. Set Base Scores
        let colleenScore = 7.0;
        let boyfriendScore = 7.0;
        let notes = "";

        // 5. THE LOGIC ENGINE (Based on your history)

        // Rule: Smoky/Oak Check (His "Off-putting" trigger)
        if (grape.includes('cabernet') || region.includes('medoc') || region.includes('pauillac')) {
            boyfriendScore -= 3.0;
            notes += "⚠️ Potential smoky/tobacco finish. ";
        }

        // Rule: Lush Fruit Check (His "Favorite" trigger)
        if (grape.includes('merlot') || grape.includes('montepulciano') || grape.includes('riesling')) {
            boyfriendScore += 1.5;
            notes += "✨ Lush, fruit-forward profile. ";
        }

        // Rule: Salinity/Mineral Check (Your "Soil Soul" trigger)
        if (region.includes('sicily') || region.includes('marche') || grape.includes('vermentino') || grape.includes('gruner')) {
            colleenScore += 2.0;
            notes += "🌊 High minerality/salinity detected. ";
        }

        // Rule: Sweetness Warning (Your "Syrupy" trigger)
        if (grape.includes('moscato') || grape.includes('gewurztraminer')) {
            colleenScore -= 2.0;
            notes += "🍭 Higher sweetness level. ";
        }

        // 6. Display the results (WCAG compliant: clear text output)
        colleenDisplay.innerHTML = `<h3>Colleen's Predicted Score: ${colleenScore.toFixed(1)}</h3>`;
        boyfriendDisplay.innerHTML = `<h3>Boyfriend's Predicted Score: ${boyfriendScore.toFixed(1)}</h3><p>${notes}</p>`;
        
        // Use aria-live to announce results to screen readers
        document.getElementById('results').setAttribute('aria-label', `Prediction results updated. Colleen: ${colleenScore}, Boyfriend: ${boyfriendScore}`);
    });
});
