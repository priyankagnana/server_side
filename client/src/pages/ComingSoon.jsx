import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Sparkles, Coffee } from 'lucide-react';

const ComingSoon = () => {
  const navigate = useNavigate();

  const handleLogout = () => {

    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('tokenExpiry');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('tokenExpiry');
    
    window.location.href = '/login';
  };

  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url(/comingsoon.jpeg)",
      }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>
      <div className="relative z-10 w-full max-w-4xl mx-4 text-center">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-12 md:p-16">
          <div className="flex justify-center mb-8">
            <div className="text-6xl md:text-7xl">🐣</div>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-black mb-6">
            CampusConnect
          </h1>

          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Coming Soon
          </h2>

          <p className="text-xl md:text-2xl text-gray-800 mb-12 leading-relaxed">
            We're building something amazing for you!
            <br />
            Stay tuned for the launch of our campus community platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 transform hover:scale-105 transition-all duration-300">
              <Sparkles className="text-yellow-500 mx-auto mb-4" size={32} />
              <h3 className="text-black font-semibold text-lg mb-2">
                Innovative Features
              </h3>
              <p className="text-gray-700 text-sm">
                Cutting-edge tools for campus life
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 transform hover:scale-105 transition-all duration-300">
              <Coffee className="text-pink-500 mx-auto mb-4" size={32} />
              <h3 className="text-black font-semibold text-lg mb-2">
                Community Driven
              </h3>
              <p className="text-gray-700 text-sm">
                Connect with students and alumni
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 transform hover:scale-105 transition-all duration-300">
              <div className="text-4xl mx-auto mb-4">🫣</div>
              <h3 className="text-black font-semibold text-lg mb-2">
                Coming Soon
              </h3>
              <p className="text-gray-700 text-sm">
                Exciting updates on the way
              </p>
            </div>
          </div>

          {user.email && (
            <div className="bg-gray-50 rounded-xl p-4 mb-8 border border-gray-200">
              <p className="text-gray-700 text-sm mb-1">Signed in as</p>
              <p className="text-black font-semibold">{user.email}</p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-semibold text-lg border border-transparent shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400"
            aria-label="Log out"
          >
            <LogOut size={20} className="text-white" />
            Log Out
          </button>

          <div className="mt-12">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 rounded-full animate-progress"
                style={{ width: "5%" }}
              ></div>
            </div>
            <p className="text-gray-700 text-sm mt-4">
              Development in progress... 5%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;

