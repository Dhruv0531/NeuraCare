import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Assessment() {
  const navigate = useNavigate();

  const steps = [
    {
      name: "Depression (PHQ-9)",
      questions: [
        "Little interest or pleasure in doing things",
        "Feeling down, depressed, or hopeless",
        "Trouble falling or staying asleep, or sleeping too much",
        "Feeling tired or having little energy",
        "Poor appetite or overeating",
        "Feeling bad about yourself — or that you are a failure",
        "Trouble concentrating on things",
        "Moving or speaking slowly or being restless",
        "Thoughts that you would be better off dead or hurting yourself",
      ],
    },
    {
      name: "Anxiety (GAD-7)",
      questions: [
        "Feeling nervous, anxious, or on edge",
        "Not being able to stop or control worrying",
        "Worrying too much about different things",
        "Trouble relaxing",
        "Being so restless that it’s hard to sit still",
        "Becoming easily annoyed or irritable",
        "Feeling afraid as if something awful might happen",
      ],
    },
    {
      name: "Stress (DASS-21)",
      questions: [
        "I found it hard to wind down",
        "I tended to over-react to situations",
        "I felt that I was using a lot of nervous energy",
        "I found myself getting agitated",
        "I found it difficult to relax",
        "I was intolerant of anything that kept me from getting on",
        "I felt that I was rather touchy",
      ],
    },
    {
      name: "Sleep (ISI)",
      questions: [
        "Difficulty falling asleep",
        "Difficulty staying asleep",
        "Problems waking up too early",
        "How satisfied are you with your sleep pattern?",
        "How noticeable is your sleep problem to others?",
        "How worried are you about your sleep?",
        "How much does your sleep problem interfere with daily functioning?",
      ],
    },
  ];

  const [stepIndex, setStepIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);

  // ✅ store full answers (not just scores)
  const [answers, setAnswers] = useState([[], [], [], []]);

  const currentStep = steps[stepIndex];
  const currentQuestion = currentStep.questions[questionIndex];

  const handleAnswer = (value) => {
    const updatedAnswers = [...answers];
    updatedAnswers[stepIndex].push(value);
    setAnswers(updatedAnswers);

    setTimeout(() => {
      if (questionIndex < currentStep.questions.length - 1) {
        setQuestionIndex(questionIndex + 1);
      } else {
        if (stepIndex < steps.length - 1) {
          setStepIndex(stepIndex + 1);
          setQuestionIndex(0);
        } else {
          // 🔥 CALL BACKEND
          fetch("http://127.0.0.1:8000/predict", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              answers: {
                phq: updatedAnswers[0],
                gad: updatedAnswers[1],
                stress: updatedAnswers[2],
                sleep: updatedAnswers[3],
              },
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              // optional save
              fetch("http://127.0.0.1:8000/save", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ scores: data }),
              });

              navigate("/result", { state: { result: data } });
            })
            .catch(() => {
              alert("Backend error. Check if server is running.");
            });
        }
      }
    }, 150);
  };

  return (
    <div className="container">
      {/* Step Progress */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "4px",
              background: i <= stepIndex ? "#3ecfb2" : "#2a2f3a",
            }}
          />
        ))}
      </div>

      <p className="subtitle">{currentStep.name}</p>
      <p className="subtitle">
        Step {stepIndex + 1} of {steps.length} • Question{" "}
        {questionIndex + 1} of {currentStep.questions.length}
      </p>

      <h2 style={{ marginTop: "20px" }}>{currentQuestion}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginTop: "25px",
        }}
      >
        {[0, 1, 2, 3].map((val) => (
          <div
            key={val}
            onClick={() => handleAnswer(val)}
            className="card"
            style={{ textAlign: "center", cursor: "pointer" }}
          >
            <h3>{val}</h3>
            <p className="subtitle" style={{ fontSize: "12px" }}>
              {[
                "Not at all",
                "Several days",
                "More than half",
                "Nearly every day",
              ][val]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}