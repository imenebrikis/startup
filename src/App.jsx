import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AddListing from "./pages/AddListing";
import Browse from "./pages/Browse";
import ListingDetail from "./pages/ListingDetail";
import Exchanges from "./pages/Exchanges";
import Messages from "./pages/Messages";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminListings from "./pages/AdminListings";
import AdminTransactions from "./pages/AdminTransactions";
import AdminReports from "./pages/AdminReports";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/add-listing" element={<AddListing />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/my-exchanges" element={<Exchanges />} />
        <Route path="/modifier-annonce/:id" element={<AddListing />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/listings" element={<AdminListings />} />
        <Route path="/admin/transactions" element={<AdminTransactions />} />
        <Route path="/admin/reports" element={<AdminReports />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;