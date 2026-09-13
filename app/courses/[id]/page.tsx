'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CourseViewer from '@/components/CourseViewer';
import { getStoredUser, getStoredCourses } from '@/lib/store';
import { COACH_ADMIN } from '@/lib/initialData';
import { User, Course } from '@/lib/types';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [currentUser, setCurrentUser] = useState<User>(COACH_ADMIN);
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    const allCourses = getStoredCourses();
    const found = allCourses.find((c) => c.id === courseId);
    if (found) {
      setCourse(found);
    }
  }, [courseId]);

  if (!course) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-gray-500">Course not found.</p>
        <Link
          href="/courses"
          className="text-xs font-bold text-sjsfi-900 hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Courses Catalog</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-sjsfi-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Courses</span>
      </Link>

      <CourseViewer course={course} currentUser={currentUser} />
    </div>
  );
}
