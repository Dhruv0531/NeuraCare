import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DASS_ITEMS = [
  // Stress
  { id: "Q1A", scale: "Stress", text: "I found it hard to wind down" },
  { id: "Q6A", scale: "Stress", text: "I tended to over-react to situations" },
  { id: "Q8A", scale: "Stress", text: "I found it difficult to relax" },
  { id: "Q11A", scale: "Stress", text: "I found myself getting upset rather easily" },
  { id: "Q12A", scale: "Stress", text: "I felt that I was using a lot of nervous energy" },
  { id: "Q14A", scale: "Stress", text: "I found myself getting impatient" },
  { id: "Q18A", scale: "Stress", text: "I felt that I was rather touchy" },
  { id: "Q22A", scale: "Stress", text: "I found it hard to calm down after something upset me" },
  { id: "Q27A", scale: "Stress", text: "I found that I was very irritable" },
  { id: "Q29A", scale: "Stress", text: "I found it hard to calm down" },
  { id: "Q32A", scale: "Stress", text: "I found it difficult to tolerate interruptions" },
  { id: "Q33A", scale: "Stress", text: "I was in a state of nervous tension" },
  { id: "Q35A", scale: "Stress", text: "I was intolerant of anything that kept me from getting on" },
  { id: "Q39A", scale: "Stress", text: "I found myself getting agitated" },

  // Anxiety
  { id: "Q2A", scale: "Anxiety", text: "I was aware of dryness of my mouth" },
  { id: "Q4A", scale: "Anxiety", text: "I experienced breathing difficulty (e.g. excessively rapid breathing)" },
  { id: "Q7A", scale: "Anxiety", text: "I experienced trembling (e.g. in the hands)" },
  { id: "Q9A", scale: "Anxiety", text: "I was worried about situations in which I might panic and make a fool of myself" },
  { id: "Q15A", scale: "Anxiety", text: "I felt I was close to panic" },
  { id: "Q19A", scale: "Anxiety", text: "I was aware of the action of my heart in the absence of physical exertion" },
  { id: "Q20A", scale: "Anxiety", text: "I felt scared without any good reason" },
  { id: "Q23A", scale: "Anxiety", text: "I feared that I would be 'thrown' by some trivial but unfamiliar task" },
  { id: "Q25A", scale: "Anxiety", text: "I was aware of dryness of my mouth or throat" },
  { id: "Q28A", scale: "Anxiety", text: "I felt I was close to panic" },
  { id: "Q30A", scale: "Anxiety", text: "I feared that I would be thrown by some task" },
  { id: "Q36A", scale: "Anxiety", text: "I felt terrified" },
  { id: "Q40A", scale: "Anxiety", text: "I was worried about situations in which I might panic" },
  { id: "Q41A", scale: "Anxiety", text: "I experienced trembling" },

  // Depression
  { id: "Q3A", scale: "Depression", text: "I couldn't seem to experience any positive feeling at all" },
  { id: "Q5A", scale: "Depression", text: "I just couldn't seem to get going" },
  { id: "Q10A", scale: "Depression", text: "I felt that I had nothing to look forward to" },
  { id: "Q13A", scale: "Depression", text: "I felt sad and depressed" },
  { id: "Q16A", scale: "Depression", text: "I felt that I had lost interest in just about everything" },
  { id: "Q17A", scale: "Depression", text: "I felt I wasn't worth much as a person" },
  { id: "Q21A", scale: "Depression", text: "I felt that life was meaningless" },
  { id: "Q24A", scale: "Depression", text: "I was unable to become enthusiastic about anything" },
  { id: "Q26A", scale: "Depression", text: "I felt down-hearted and blue" },
  { id: "Q31A", scale: "Depression", text: "I was unable to become enthusiastic" },
  { id: "Q34A", scale: "Depression", text: "I felt I was pretty worthless" },
  { id: "Q37A", scale: "Depression", text: "I could see nothing in the future to be hopeful about" },
  { id: "Q38A", scale: "Depression", text: "I felt that life was empty" },
  { id: "Q42A", scale: "Depression", text: "I found it difficult to work up the initiative to do things" }
];

const SLEEP_ITEMS = [
  "Difficulty falling asleep",
  "Difficulty staying asleep",
  "Problems waking up too early",
  "How satisfied/dissatisfied are you with your sleep pattern?",
  "How noticeable to others is your sleep problem?",
  "How worried/distressed are you about your sleep problem?",
  "How much does your sleep problem interfere with daily functioning?"
];

export default function Assessment() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);

  const [demographics, setDemographics] = useState({
    age: 25,
    gender: 1,
    education: 3,
    urban: 3,
    religion: 1,
    orientation: 1,
    race: 3,
    married: 1,
    familysize: 3
  });

  const [dassAnswers, setDassAnswers] = useState(() => {
    const initial = {};
    DASS_ITEMS.forEach((item) => {
      initial[item.id] = 0;
    });
    return initial;
  });

  const [dassIndex, setDassIndex] = useState(0);
  const [sleepAnswers, setSleepAnswers] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [sleepIndex, setSleepIndex] = useState(0);

  const [freeText, setFreeText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentDassItem = DASS_ITEMS[dassIndex];
  const currentSleepItem = SLEEP_ITEMS[sleepIndex];

  const handleDemographicChange = (e) => {
    const { name, value } = e.target;
    setDemographics((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleDassAnswer = (val) => {
    setDassAnswers((prev) => ({ ...prev, [currentDassItem.id]: val }));
    if (dassIndex < DASS_ITEMS.length - 1) {
      setDassIndex(dassIndex + 1);
    } else {
      setCurrentStep(2);
    }
  };

  const handleSleepAnswer = (val) => {
    const updated = [...sleepAnswers];
    updated[sleepIndex] = val;
    setSleepAnswers(updated);

    if (sleepIndex < SLEEP_ITEMS.length - 1) {
      setSleepIndex(sleepIndex + 1);
    } else {
      setCurrentStep(3);
    }
  };

  const handleSubmitAll = () => {
    setIsSubmitting(true);

    const payload = {
      answers: {
        ...dassAnswers,
        ...demographics
      },
      sleep_answers: sleepAnswers,
      text: freeText
    };

    fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((data) => {
        setIsSubmitting(false);
        navigate("/result", { state: { result: data } });
      })
      .catch((err) => {
        setIsSubmitting(false);
        alert("Error connecting to backend ML API. Make sure FastAPI server is running.");
      });
  };

  return (
    <div className="container" style={{ maxWidth: "720px", margin: "0 auto", padding: "20px" }}>
      {/* Progress Bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {["Demographics", "DASS-42 Assessment", "Sleep Quality (ISI)", "Optional Journal Text"].map((name, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "6px",
              borderRadius: "4px",
              background: i <= currentStep ? "#3ecfb2" : "#2a2f3a",
              transition: "all 0.3s ease"
            }}
            title={name}
          />
        ))}
      </div>

      {/* STEP 0: DEMOGRAPHICS */}
      {currentStep === 0 && (
        <div className="card" style={{ padding: "24px", borderRadius: "12px", background: "#1a1d24" }}>
          <h2>Step 1: Background & Demographics</h2>
          <p className="subtitle" style={{ marginBottom: "20px" }}>
            These parameters tailor the ML risk models to your profile.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Age</label>
              <input
                type="number"
                name="age"
                value={demographics.age}
                onChange={handleDemographicChange}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#2a2f3a", color: "#fff", border: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Gender</label>
              <select
                name="gender"
                value={demographics.gender}
                onChange={handleDemographicChange}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#2a2f3a", color: "#fff", border: "none" }}
              >
                <option value={1}>Male</option>
                <option value={2}>Female</option>
                <option value={3}>Other / Non-binary</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Education Level</label>
              <select
                name="education"
                value={demographics.education}
                onChange={handleDemographicChange}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#2a2f3a", color: "#fff", border: "none" }}
              >
                <option value={1}>Less than high school</option>
                <option value={2}>High school diploma</option>
                <option value={3}>University degree</option>
                <option value={4}>Graduate / Higher degree</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Living Area</label>
              <select
                name="urban"
                value={demographics.urban}
                onChange={handleDemographicChange}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#2a2f3a", color: "#fff", border: "none" }}
              >
                <option value={1}>Rural</option>
                <option value={2}>Suburban</option>
                <option value={3}>Urban</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Marital Status</label>
              <select
                name="married"
                value={demographics.married}
                onChange={handleDemographicChange}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#2a2f3a", color: "#fff", border: "none" }}
              >
                <option value={1}>Never Married</option>
                <option value={2}>Currently Married</option>
                <option value={3}>Previously Married / Divorced</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Family Size</label>
              <input
                type="number"
                name="familysize"
                value={demographics.familysize}
                onChange={handleDemographicChange}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#2a2f3a", color: "#fff", border: "none" }}
              />
            </div>
          </div>

          <button
            onClick={() => setCurrentStep(1)}
            style={{
              marginTop: "24px",
              padding: "12px 24px",
              background: "#3ecfb2",
              color: "#000",
              fontWeight: "bold",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              width: "100%"
            }}
          >
            Continue to DASS-42 Assessment →
          </button>
        </div>
      )}

      {/* STEP 1: DASS-42 */}
      {currentStep === 1 && (
        <div className="card" style={{ padding: "24px", borderRadius: "12px", background: "#1a1d24" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: "#2a2f3a", color: "#3ecfb2", padding: "4px 12px", borderRadius: "12px", fontSize: "14px", fontWeight: "bold" }}>
              {currentDassItem.scale} Subscale
            </span>
            <span style={{ color: "#888", fontSize: "14px" }}>
              Question {dassIndex + 1} of {DASS_ITEMS.length}
            </span>
          </div>

          <h3 style={{ marginTop: "20px", fontSize: "20px", minHeight: "60px" }}>
            "{currentDassItem.text}"
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "20px" }}>
            {[
              { val: 0, label: "Did not apply to me at all" },
              { val: 1, label: "Applied to me to some degree" },
              { val: 2, label: "Applied to me a considerable degree" },
              { val: 3, label: "Applied to me very much / most of time" }
            ].map(({ val, label }) => (
              <div
                key={val}
                onClick={() => handleDassAnswer(val)}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  background: "#2a2f3a",
                  cursor: "pointer",
                  border: dassAnswers[currentDassItem.id] === val ? "2px solid #3ecfb2" : "1px solid transparent",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ fontWeight: "bold", color: "#3ecfb2", marginBottom: "4px" }}>Rating {val}</div>
                <div style={{ fontSize: "13px", color: "#ddd" }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
            <button
              disabled={dassIndex === 0}
              onClick={() => setDassIndex(dassIndex - 1)}
              style={{ padding: "8px 16px", background: "transparent", color: dassIndex === 0 ? "#555" : "#ccc", border: "1px solid #444", borderRadius: "6px", cursor: dassIndex === 0 ? "not-allowed" : "pointer" }}
            >
              ← Previous
            </button>
            <button
              onClick={() => dassIndex < DASS_ITEMS.length - 1 ? setDassIndex(dassIndex + 1) : setCurrentStep(2)}
              style={{ padding: "8px 16px", background: "#3ecfb2", color: "#000", fontWeight: "bold", border: "none", borderRadius: "6px", cursor: "pointer" }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SLEEP (ISI) */}
      {currentStep === 2 && (
        <div className="card" style={{ padding: "24px", borderRadius: "12px", background: "#1a1d24" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: "#2a2f3a", color: "#8a2be2", padding: "4px 12px", borderRadius: "12px", fontSize: "14px", fontWeight: "bold" }}>
              Sleep (ISI Assessment)
            </span>
            <span style={{ color: "#888", fontSize: "14px" }}>
              Question {sleepIndex + 1} of {SLEEP_ITEMS.length}
            </span>
          </div>

          <h3 style={{ marginTop: "20px", fontSize: "20px", minHeight: "60px" }}>
            "{currentSleepItem}"
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", marginTop: "20px" }}>
            {[
              { val: 0, label: "0 - None / Very Satisfied / Not at all" },
              { val: 1, label: "1 - Mild / Satisfied / A little" },
              { val: 2, label: "2 - Moderate / Neutral / Somewhat" },
              { val: 3, label: "3 - Severe / Dissatisfied / Much" },
              { val: 4, label: "4 - Very Severe / Very Dissatisfied / Very much" }
            ].map(({ val, label }) => (
              <div
                key={val}
                onClick={() => handleSleepAnswer(val)}
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  background: sleepAnswers[sleepIndex] === val ? "#3a2f5a" : "#2a2f3a",
                  border: sleepAnswers[sleepIndex] === val ? "2px solid #8a2be2" : "1px solid transparent",
                  cursor: "pointer"
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: OPTIONAL FREE-TEXT JOURNAL */}
      {currentStep === 3 && (
        <div className="card" style={{ padding: "24px", borderRadius: "12px", background: "#1a1d24" }}>
          <h2>Step 4: Optional Emotional Text Journal</h2>
          <p className="subtitle" style={{ marginBottom: "8px" }}>
            Want to share anything about how you've been feeling recently?
          </p>
          <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>
            This text is optional. If provided, our Hugging Face GoEmotions DistilBERT model will detect emotional language indicators.
          </p>

          <textarea
            rows={5}
            maxLength={1000}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Write about your recent thoughts, feelings or experiences (optional)..."
            style={{ width: "100%", padding: "14px", borderRadius: "8px", background: "#2a2f3a", color: "#fff", border: "1px solid #444", resize: "vertical" }}
          />

          <div style={{ textAlign: "right", color: "#aaa", fontSize: "12px", marginTop: "4px" }}>
            {freeText.length} / 1000 characters
          </div>

          <button
            onClick={handleSubmitAll}
            disabled={isSubmitting}
            style={{
              marginTop: "20px",
              padding: "14px 28px",
              background: isSubmitting ? "#555" : "#3ecfb2",
              color: "#000",
              fontWeight: "bold",
              fontSize: "16px",
              border: "none",
              borderRadius: "8px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              width: "100%"
            }}
          >
            {isSubmitting ? "Processing AI Analysis..." : "Submit Full Assessment & View Results →"}
          </button>
        </div>
      )}

      {/* Non-diagnostic Disclaimer Footer */}
      <div style={{ marginTop: "24px", padding: "12px", borderRadius: "8px", background: "#14171f", border: "1px solid #232732", textAlign: "center", color: "#888", fontSize: "12px" }}>
        ⚠️ <strong>Medical Disclaimer:</strong> NeuraCare provides AI-assisted mental-health risk assessment and screening. It is not a medical diagnosis and should not replace evaluation by a qualified mental-health professional.
      </div>
    </div>
  );
}