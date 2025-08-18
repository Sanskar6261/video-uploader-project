import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import UploadProvider from "./context/UploadContext";
import SelectFile from "./pages/SelectFile";
import Progress from "./pages/Progress";
import Result from "./pages/Result";
import "./styles.css";

function WithProvider() {
  const navigate = useNavigate();
  return (
    <UploadProvider navigate={navigate}>
      <Routes>
        <Route path="/" element={<SelectFile />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/done" element={<Result />} />
      </Routes>
    </UploadProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WithProvider />
    </BrowserRouter>
  );
}
