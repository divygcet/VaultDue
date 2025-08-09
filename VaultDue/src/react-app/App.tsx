import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from '@getmocha/users-service/react';
import HomePage from "@/react-app/pages/Home";
import AuthCallback from "@/react-app/pages/AuthCallback";
import UserProfile from "@/react-app/pages/UserProfile";
import Reminders from "@/react-app/pages/Reminders";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/reminders" element={<Reminders />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
