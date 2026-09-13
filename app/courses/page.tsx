'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  PlusCircle,
  Video,
  Layout,
  Award,
  ChevronRight,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { getStoredUser, getStoredCourses } from '@/lib/store';
import { COACH_ADMIN } from '@/lib/initialData';
import { User, Course } from '@/lib/types';

export default function CoursesPage() {
  const [currentUser, setCurrentUser] = useState<User>(COACH_ADMIN);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    setCurrentUser(getStoredUser());
    setCourses(getStoredCourses());
  }, []);

  const isCoach = currentUser.role === 'coach';

  const categories = ['All', 'Openings', 'Middlegame', 'Endgames', 'Tactics'];

  const filteredCourses =
    selectedCategory === 'All'
      ? courses
      : courses.filter((c) => c.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-sjsfi-100 text-sjsfi-900 border border-sjsfi-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sjsfi-800" />
              SJSFI Chess Curriculum
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {courses.length} Master Courses
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            Chess Studies & Video Masterclasses
          </h1>
        </div>

        {isCoach && (
          <Link
            href="/courses/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-sjsfi-900 hover:bg-sjsfi-800 text-white transition-all shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-sjsfi-gold" />
            <span>Create New Course</span>
          </Link>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
              selectedCategory === cat
                ? 'bg-sjsfi-900 text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-sjsfi-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const hasBoard = course.chapters.some((ch) => ch.type === 'board' || ch.type === 'both');
          const hasVideo = course.chapters.some((ch) => ch.type === 'video' || ch.type === 'both');

          return (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-gray-200 hover:border-sjsfi-300 shadow-card hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Badges row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sjsfi-100 text-sjsfi-900 border border-sjsfi-200">
                    {course.level}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    {course.category}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 group-hover:text-sjsfi-900 transition-colors line-clamp-2">
                  {course.title}
                </h3>

                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                  {course.description}
                </p>

                {/* Lesson Formats Supported in this Course */}
                <div className="flex items-center gap-2 pt-1">
                  {hasBoard && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      <Layout className="w-3 h-3" /> Move-by-Move
                    </span>
                  )}
                  {hasVideo && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      <Video className="w-3 h-3" /> Video Lessons
                    </span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{course.chapters.length} Chapters</span>
                </div>

                <Link
                  href={`/courses/${course.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sjsfi-50 group-hover:bg-sjsfi-900 text-sjsfi-900 group-hover:text-white transition-all shadow-xs border border-sjsfi-200 group-hover:border-transparent"
                >
                  <span>Open Course</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
