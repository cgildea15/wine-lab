document.addEventListener('DOMContentLoaded', () => {
    const wineForm = document.getElementById('wine-form');
    const colleenDisplay = document.getElementById('colleen-score');
    const daveDisplay = document.getElementById('dave-score');

    wineForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get Input Values
        const label = document.getElementById('labelName').value;
        const abv = parseFloat(document.getElementById('abv').value) || 0;
        const isOaky = document.getElementById('isOaky').checked;
        const region = document.getElementById('region').value.toLowerCase();
        const style = document.getElementById('wineStyle').value.toLowerCase();

        let colleenScore = 7.0;
        let daveScore = 7.0;
        let notes = [];

        // Logic 1: The "Dave" Smoky Trigger
        if (isOaky) {
            daveScore -= 4.0;
            notes.push("⚠️ High risk for Dave: Smoky/Oak finish.");
        }

        // Logic 2: The "Colleen" Burn Check
        if (abv > 14.2) {
            colleenScore -= 2.0;
            notes.push("🔥 High ABV: Possible alcoholic burn.");
        } else if (abv > 0 && abv < 12.5) {
            colleenScore += 1.0;
            notes.push("🍃 Low ABV: Crisp and refreshing.");
        }

        // Logic 3: Soil Soul (Coastal/Volcanic)
        if (region.includes('coast') || region.includes('sicily') || region.includes('chile')) {
            colleenScore += 1.5;
            notes.push("🌊 Saline/Mineral notes expected.");
        }

        // Display Results
        colleenDisplay.innerHTML = `<h3>Colleen: ${colleenScore.toFixed(1)}</h3>`;
        daveDisplay.innerHTML = `<h3>Dave: ${daveScore.toFixed(1)}</h3><p>${notes.join('<br>')}</p>`;
    });
});
