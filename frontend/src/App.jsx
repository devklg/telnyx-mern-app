import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4">
            <h1 className="text-3xl font-bold text-gray-900">
              BMAD V4 - Lead Qualification
            </h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 px-4">
          <Routes>
            <Route path="/" element={
              <div className="card">
                <h2 className="text-2xl font-semibold mb-4">Welcome to BMAD V4</h2>
                <p className="text-gray-600">
                  Lead Qualification & Management System
                </p>
                <div className="mt-4">
                  <button className="btn-primary mr-2">Get Started</button>
                  <button className="btn-secondary">Learn More</button>
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;