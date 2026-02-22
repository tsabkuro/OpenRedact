import "@/App.css";

// import WebViewer from '@/components/WebViewer.js';
import PDFJsViewer from "./components/PDFJsViewer";

function App() {
  return <PDFJsViewer file="/test.pdf" />
}

export default App;
