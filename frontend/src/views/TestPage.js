import React, { useState } from "react";
import { Card, Button, Table } from "react-bootstrap";

function TestPage() {
  const [selectedClass, setSelectedClass] = useState("");
  const [videoStream, setVideoStream] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setVideoStream(stream);
      document.getElementById("webcam").srcObject = stream;
    } catch (err) {
      console.error("Camera Error:", err);
    }
  };

  const handleStopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
      setVideoStream(null);
    }
  };

  const handlePredict = () => {
    // Backend prediction API placeholder
    setPrediction({ class: selectedClass, confidence: "95%" });
  };

  return (
    <div className="container-fluid" dir="rtl">
      <Card className="p-3">
        <h4 className="mb-3">تست پردازش تصویر</h4>

        {/* Select class */}
        <div className="mb-3">
          <label>کلاس مورد نظر:</label>
          <select
            className="form-control"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">انتخاب کنید</option>
            <option value="tear">پارگی نوار نقاله</option>
            <option value="misalignment">انحراف نوار</option>
            <option value="spillage">ریزش مواد</option>
            <option value="object">شیء خارجی</option>
          </select>
        </div>

        {/* Webcam feed */}
        <div className="text-center mb-3">
          <video id="webcam" autoPlay playsInline width="480" height="360" style={{ borderRadius: "10px" }}></video>
        </div>

        {/* Buttons */}
        <div className="d-flex gap-2 mb-4 justify-content-center">
          <Button variant="success" onClick={handleStartCamera}>روشن کردن دوربین</Button>
          <Button variant="danger" onClick={handleStopCamera}>خاموش کردن دوربین</Button>
          <Button variant="primary" onClick={handlePredict} disabled={!selectedClass}>تشخیص</Button>
        </div>

        {/* Prediction Table */}
        {prediction && (
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>کلاس تشخیص داده‌ شده</th>
                <th>درصد اطمینان</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{prediction.class}</td>
                <td>{prediction.confidence}</td>
              </tr>
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default TestPage;
