const quizDatabase = [
    {
        category: "Sterilization",
        question: "What is a factor that can impact sterilization?",
        options: ["The type of microorganisms present", "Nothing", "Standing by autoclave", "Prolonged stare"],
        answer: "The type of microorganisms present"
    },
    {
        category: "Sterilization",
        question: "Prior to steam sterilization what was used to Kill bacteria?",
        options: ["Milk", "Stick", "Boiled water", "Rock"],
        answer: "Boiled water"
    },
    {
        category: "Sterilization",
        question: "Where is the chamber drain located in most sterilizers",
        options: ["The front or center", "Back wall", "The door", "Top"],
        answer: "The front or center"
    },
    {
        category: "Sterilization",
        question: "Where is the thermostatic trap located?",
        options: ["Under the seat", "In the assembly area", "In the drain line", "In the printout"],
        answer: "In the drain line"
    },
    {
        category: "Sterilization",
        question: "When does the exposure phase begin?",
        options: ["Once the desired temperature is reached", "Whenever", "At the end", "During dry cycle"],
        answer: "Once the desired temperature is reached"
    },
    {
        category: "Prep an Pack",
        question: "Which of the following is an instrument marking method? ",
        options: ["Acid-base etching", "Paint", "Coloring pencil", "Paint brush"],
        answer: "Acid-base etching"
    },
    {
        category: "Prep and Pack",
        question: "Which of the following is not allowed in the assembly area? ",
        options: ["Food and drinks", "Surgical instruments", "Spd manager", "Mean supervisor"],
        answer: "Food and drinks"
    },
    {
        category: "Prep and Pack",
        question: "What should the temperature in the assembly area be? ",
        options: [" Between 68° and 73°F (20°C to 23°C)", "Between 58deg and 78deg", "Warm", "Between 20deg and 100deg"],
        answer: " Between 68° and 73°F (20°C to 23°C)"
    },
    {
        category: "Prep and Pack",
        question: "What is the relative humidity for the assembly area?",
        options: ["Between 30% and 60%", "It doesn't matter", "Between 1% and 10%", "100%"],
        answer: "Between 30% and 60%"
    },
    {
        category: "Prep and Pack",
        question: "What is the maximum recommended weight for a containerized tray? ",
        options: [" 25 lbs", "50 lbs", "100 lbs", "10 lbs"],
        answer: " 25 lbs"
    },
    {
        category: "Decontamination",
        question: "Which part of the hospital generates the highest volume of contaminated items?",
        options: ["The operating rooms", "Decon", "Assembly area", "Kitchen"],
        answer: "The operating rooms"
    },
    {
        category: "Decontamination",
        question: "Where does instrument decontamination begin?",
        options: ["At the point of use", "In assembly", "At home", "In decon"],
        answer: "At the point of use"
    },
    {
        category: "Decontamination",
        question: "What is the best way to transport soiled instruments?",
        options: ["In an enclosed cart", "Paper bag", "In gloved hand", "By mail"],
        answer: "In an enclosed cart"
    },
    {
        category: "Decontamination",
        question: "What should the temperature in the denomination area be?",
        options: ["Between 60°F and 65°F (16°C and 18°C)", "100 degree", "Below Zero", "Doesn't matter"],
        answer: "Between 60°F and 65°F (16°C and 18°C)"
    },
    {
        category: "Decontamination",
        question: "What is the relative humidity for the decontamination area?",
        options: ["Between 30% to 60%", "Between 90 to 100", "super humid", "Between 20% to 40%"],
        answer: "Between 30% to 60%"
    },




];
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;

function startQuiz(selectedCategory) {
    // 1. Filter questions by selected category
    currentQuestions = quizDatabase.filter(q => q.category === selectedCategory);

    // 2. Reset tracking variables
    currentQuestionIndex = 0;
    score = 0;

    // 3. UI Screen Transitions
    document.getElementById("category-screen").style.display = "none";
    document.getElementById("result-screen").style.display = "none";
    document.getElementById("question-screen").style.display = "block";
    document.getElementById("category-title").innerText = selectedCategory;

    loadQuestion();
}

function loadQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        return showResults();
    }

    const currentQ = currentQuestions[currentQuestionIndex];
    document.getElementById("question-text").innerText = currentQ.question;

    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = ""; // Clear out previous buttons

    // Create clickable buttons for each option
    currentQ.options.forEach(option => {
        const button = document.createElement("button");
        button.innerText = option;
        button.onclick = () => handleAnswer(option, currentQ.answer);
        optionsContainer.appendChild(button);
    });
}

function handleAnswer(selectedOption, correctAnswer) {
    if (selectedOption === correctAnswer) {
        score++;
    }
    currentQuestionIndex++;
    loadQuestion();
}

function showResults() {
    document.getElementById("question-screen").style.display = "none";
    document.getElementById("result-screen").style.display = "block";
    document.getElementById("score-text").innerText = `Your Score: ${score} / ${currentQuestions.length}`;
}

function resetQuiz() {
    document.getElementById("result-screen").style.display = "none";
    document.getElementById("category-screen").style.display = "block";
}






// panels

const panels = document.querySelectorAll('.panel')

panels.forEach(panel => {
    panel.addEventListener('click', () => {
        removeActiveClasses()
        panel.classList.add('active')
    })
})

function removeActiveClasses() {
    panels.forEach(panel => {
        panel.classList.remove('active')
    })
}


// Form

const labels = document.querySelectorAll('.form-control label');

labels.forEach(label => {
    label.innerHTML = label.innerText
        .split('').map((letter, idx) => `<span style="transition-delay:${idx * 50}ms">${letter}</span>`).join('')
})


