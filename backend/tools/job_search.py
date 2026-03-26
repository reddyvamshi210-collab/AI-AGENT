"""Job Search Tool - Simulated job search (plug in real API like LinkedIn, Indeed, etc.)."""
import hashlib
from typing import Optional


# In production, replace this with actual API calls to LinkedIn, Indeed, Glassdoor, etc.
MOCK_JOBS = [
    {
        "title": "Senior Software Engineer",
        "company": "TechCorp",
        "location": "San Francisco, CA (Remote)",
        "url": "https://example.com/jobs/1",
        "description": "Build scalable distributed systems. Python, Go, AWS experience required.",
        "match_score": 92,
    },
    {
        "title": "Full Stack Developer",
        "company": "StartupXYZ",
        "location": "New York, NY (Hybrid)",
        "url": "https://example.com/jobs/2",
        "description": "React, Node.js, PostgreSQL. Fast-paced startup environment.",
        "match_score": 87,
    },
    {
        "title": "Machine Learning Engineer",
        "company": "AI Labs Inc.",
        "location": "Remote",
        "url": "https://example.com/jobs/3",
        "description": "Design and deploy ML models at scale. PyTorch, MLOps, Kubernetes.",
        "match_score": 78,
    },
    {
        "title": "Backend Engineer",
        "company": "FinTech Solutions",
        "location": "Austin, TX",
        "url": "https://example.com/jobs/4",
        "description": "High-performance APIs for financial data. Java/Python, microservices.",
        "match_score": 85,
    },
    {
        "title": "DevOps Engineer",
        "company": "CloudScale",
        "location": "Seattle, WA (Remote)",
        "url": "https://example.com/jobs/5",
        "description": "CI/CD pipelines, Terraform, Kubernetes, AWS/GCP infrastructure.",
        "match_score": 73,
    },
    {
        "title": "Frontend Engineer",
        "company": "DesignHub",
        "location": "Los Angeles, CA",
        "url": "https://example.com/jobs/6",
        "description": "Build beautiful UIs with React, TypeScript, and Next.js.",
        "match_score": 81,
    },
    {
        "title": "Data Engineer",
        "company": "DataFlow Corp",
        "location": "Chicago, IL (Hybrid)",
        "url": "https://example.com/jobs/7",
        "description": "ETL pipelines, Spark, Airflow, data warehouse architecture.",
        "match_score": 76,
    },
    {
        "title": "Product Manager - AI",
        "company": "InnovateTech",
        "location": "Remote",
        "url": "https://example.com/jobs/8",
        "description": "Lead AI product strategy, roadmap, and go-to-market.",
        "match_score": 65,
    },
]


class JobSearchTool:
    """Simulated job search. Replace with real job board API integration in production."""

    def search(self, query: str, location: Optional[str] = None) -> list[dict]:
        """Search for jobs matching the query and optional location."""
        query_lower = query.lower()
        location_lower = (location or "").lower()

        results = []
        for job in MOCK_JOBS:
            # Simple keyword matching
            text = f"{job['title']} {job['description']} {job['company']}".lower()
            loc = job["location"].lower()

            query_match = any(word in text for word in query_lower.split())
            location_match = not location_lower or any(
                word in loc for word in location_lower.split()
            )

            if query_match and location_match:
                results.append({
                    "title": job["title"],
                    "company": job["company"],
                    "location": job["location"],
                    "url": job["url"],
                    "match_score": job["match_score"],
                })

        # Sort by match score descending
        results.sort(key=lambda x: x["match_score"], reverse=True)
        return results[:5]
