import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AddListing from "./pages/AddListing";
import Browse from "./pages/Browse";
import ListingDetail from "./pages/ListingDetail";
import Exchanges from "./pages/Exchanges";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/add-listing" element={<AddListing />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/my-exchanges" element={<Exchanges />} />
        <Route path="/modifier-annonce/:id" element={<AddListing />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;