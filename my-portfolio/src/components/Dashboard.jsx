import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import "./courses.css"; // Reuse course styles
import API_BASE from "../apiConfig";

/* ── Videos Modal Component ── */
function VideosModal({ course, onClose }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    axios.get(`${API_BASE}/courses/${course.id}/videos/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setVideos(res.data);
      if (res.data.length > 0) setActiveVideo(res.data[0]);
    })
    .catch(err => console.error("Error fetching videos:", err))
    .finally(() => setLoading(false));
  }, [course]);

  return (
    <div className="pay-overlay" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div className="pay-modal" style={{maxWidth: '900px', width: '95%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
        <button className="pay-close" onClick={onClose} style={{zIndex: 100}}><i className="bi bi-x-lg"></i></button>
        
        <div style={{padding: '30px', flex: 1, overflowY: 'auto'}}>
          <h2 style={{color: '#fff', marginBottom: '20px'}}>{course.title} - Curriculum</h2>
          
          {loading ? (
            <div style={{color: '#fff'}}>Loading curriculum...</div>
          ) : videos.length > 0 ? (
            <div className="video-layout" style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 250px', gap: '20px'}}>
              <div className="player-side">
                {activeVideo ? (
                  <div style={{background: '#000', borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9'}}>
                    <video 
                      src={activeVideo.url} 
                      controls 
                      controlsList="nodownload" 
                      style={{width: '100%', height: '100%'}}
                    />
                    <h3 style={{color: '#fff', padding: '15px', background: '#1e293b'}}>{activeVideo.title}</h3>
                  </div>
                ) : (
                  <div style={{color: '#fff', textAlign: 'center', padding: '100px'}}>Select a video to start learning</div>
                )}
              </div>
              <div className="playlist-side" style={{background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px', maxHeight: '500px', overflowY: 'auto'}}>
                {videos.map(v => (
                  <button 
                    key={v.id} 
                    onClick={() => setActiveVideo(v)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px', marginBottom: '8px', 
                      borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: activeVideo?.id === v.id ? '#6366f1' : 'rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px'
                    }}
                  >
                    <i className="bi bi-play-circle-fill"></i>
                    <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{v.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '50px'}}>No videos uploaded for this course yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { user, loading } = useContext(AuthContext);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("accessToken");
      axios.get(`${API_BASE}/courses/my/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setEnrolledCourses(res.data))
      .catch(err => console.error("Error fetching my courses:", err))
      .finally(() => setFetching(false));
    }
  }, [user]);

  if (loading || (user && fetching)) return <div className="loading">Checking your enrollments...</div>;
  if (!user) return <div className="access-denied">Please login to view your dashboard.</div>;

  return (
    <div className="dashboard-container" style={{padding: '120px 20px', minHeight: '100vh', background: '#020617'}}>
      <div className="dashboard-header" style={{maxWidth: '1200px', margin: '0 auto 40px'}}>
        <h1 style={{color: '#fff', fontSize: '2.5rem', marginBottom: '10px'}}>My Learning Dashboard</h1>
        <p style={{color: 'rgba(255,255,255,0.6)'}}>Welcome back, {user.username}! Here are the courses you've enrolled in.</p>
      </div>

      <div className="courses-grid" style={{maxWidth: '1200px', margin: '0 auto'}}>
        {enrolledCourses.length > 0 ? (
          enrolledCourses.map(c => (
            <div key={c.id} className="course-card" style={{padding: '30px'}}>
              <h3 className="course-title">{c.title}</h3>
              <p style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem'}}>Enrolled on {new Date(c.enrolled_at).toLocaleDateString()}</p>
              <div style={{marginTop: '20px'}}>
                 <button 
                  className="enroll-btn" 
                  style={{width: '100%', justifyContent: 'center'}}
                  onClick={() => setSelectedCourse(c)}
                >
                    Watch Videos <i className="bi bi-play-fill"></i>
                 </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{color: 'rgba(255,255,255,0.4)', textAlign: 'center', gridColumn: '1/-1', border: '1px dashed rgba(255,255,255,0.1)', padding: '60px', borderRadius: '20px'}}>
            <i className="bi bi-mortarboard" style={{fontSize: '3rem', display: 'block', marginBottom: '20px'}}></i>
            <h3>No courses enrolled yet</h3>
            <p>Go to the <a href="/#courses" style={{color: '#6366f1'}}>Courses section</a> to get started!</p>
          </div>
        )}
      </div>

      {selectedCourse && (
        <VideosModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}
    </div>
  );
};

export default Dashboard;
