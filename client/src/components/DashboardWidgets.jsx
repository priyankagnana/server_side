import React from 'react';
import { Clock, AlertCircle, TrendingUp, BookOpen } from 'lucide-react';

const DashboardWidgets = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Today's Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="text-purple-600" size={20} />
            <h3 className="font-semibold text-gray-900">Today's Schedule</h3>
          </div>
          <a href="#" className="text-sm text-purple-600 hover:underline">View All</a>
        </div>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-gray-500">9:00 AM</span>
            <p className="text-gray-900 font-medium">Data Structures (CS-301)</p>
          </div>
          <div className="text-sm bg-purple-50 p-2 rounded-lg relative">
            <span className="text-gray-500">11:00 AM</span>
            <p className="text-gray-900 font-medium">Linear Algebra (MATH-205)</p>
            <span className="absolute right-2 top-2 w-2 h-2 bg-purple-600 rounded-full"></span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">2:00 PM</span>
            <p className="text-gray-900 font-medium">Web Development (CS-402)</p>
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-orange-600" size={20} />
            <h3 className="font-semibold text-gray-900">Upcoming Deadlines</h3>
          </div>
          <a href="#" className="text-sm text-purple-600 hover:underline">Manage</a>
        </div>
        <div className="space-y-2">
          <div className="text-sm bg-orange-50 p-2 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-gray-900 font-medium">Database Project (CS 340)</p>
              <span className="bg-orange-200 text-orange-700 text-xs px-2 py-1 rounded-full">2 days</span>
            </div>
          </div>
          <div className="text-sm">
            <p className="text-gray-900 font-medium">Research Paper (ENG 201)</p>
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">5 days</span>
          </div>
          <div className="text-sm">
            <p className="text-gray-900 font-medium">Lab Report (PHYS 150)</p>
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">1 week</span>
          </div>
        </div>
      </div>

      {/* Academic Progress */}
      <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-sm p-4 text-white">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="text-white" size={20} />
          <h3 className="font-semibold">Academic Progress</h3>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-3xl font-bold">3.78</p>
            <p className="text-sm text-purple-100">Current GPA</p>
          </div>
          <div>
            <p className="text-sm text-purple-100">Semester: Fall 2024</p>
            <p className="text-sm text-purple-100">Credits Completed: 87/120</p>
          </div>
          <div className="w-full bg-purple-400/30 rounded-full h-2">
            <div className="bg-white rounded-full h-2" style={{ width: '72.5%' }}></div>
          </div>
        </div>
      </div>

      {/* Campus Quick Access */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="text-teal-600" size={20} />
          <h3 className="font-semibold text-gray-900">Campus Quick Access</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-100 p-3 rounded-lg">
            <p className="font-semibold text-gray-900">Library</p>
            <p className="text-sm text-gray-600">247 seats</p>
          </div>
          <div className="bg-orange-100 p-3 rounded-lg">
            <p className="font-semibold text-gray-900">Cafeteria</p>
            <p className="text-xs text-gray-600">Chicken Teriyaki</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg">
            <p className="font-semibold text-gray-900">Gym</p>
            <p className="text-xs text-gray-600">Open • Low traffic</p>
          </div>
          <div className="bg-purple-100 p-3 rounded-lg">
            <p className="font-semibold text-gray-900">Parking</p>
            <p className="text-sm text-gray-600">34 spots left</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardWidgets;

