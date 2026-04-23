import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Landing from "./pages/Landing";
import Assessment from "./pages/Assessment";
import Processing from "./pages/Processing";
import Result from "./pages/Result";
import Navbar from "./components/Navbar";
import History from "./pages/History";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/history" element={<History />} />
        <Route path="/" element={<Page><Landing /></Page>} />
        <Route path="/assessment" element={<Page><Assessment /></Page>} />
        <Route path="/processing" element={<Page><Processing /></Page>} />
        <Route path="/result" element={<Page><Result /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}

// 🔥 Wrapper for animation
function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;