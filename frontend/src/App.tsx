import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ImageProcessingPage from "./pages/ImageProcessingPage";
import VideoFramesPage from "./pages/VideoFramesPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/image-processing" element={<ImageProcessingPage />} />
        <Route path="/video-frames" element={<VideoFramesPage />} />
      </Routes>
    </Router>
  );
}

export default App;
