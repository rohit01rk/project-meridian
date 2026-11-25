# Project Meridian – Streaming Media Analytics & Personalization Platform

## Overview

Project Meridian is a streaming media analytics platform designed to collect, process, and analyze user playback events. It uses Apache Kafka for event streaming and a Bronze-Silver-Gold data processing architecture to transform raw playback data into meaningful analytical insights.

The platform helps understand user engagement, content popularity, viewing sessions, watch-time estimates, and content completion patterns. Its long-term goal is to support personalized content recommendations.

## Key Features

- **Real-Time Event Streaming:** Generates playback events such as play, pause, seek, stop, and buffer using Python and Apache Kafka.
- **Data Ingestion:** Uses Kafka producers and consumers to transfer and collect streaming events.
- **Medallion Architecture:** Organizes data into Bronze, Silver, and Gold processing layers.
- **Data Cleaning:** Validates and transforms raw playback events.
- **Sessionization:** Groups related user activities into viewing sessions using a 30-minute inactivity threshold.
- **Analytical Data Modeling:** Builds user, content, and viewing-session datasets.
- **ClickHouse Integration:** Stores analytical datasets and supports fast analytical queries.
- **dbt Transformations:** Creates SQL-based staging, intermediate, and mart models with data tests.
- **Analytics Dashboard:** Displays content engagement, viewers, sessions, estimated watch time, and completion percentages.
- **A/B Testing Prototype:** Uses statistical testing to compare control and treatment groups.

## Architecture

```text
        Python Event Producer
                 |
                 v
          Apache Kafka
                 |
                 v
          Python Consumer
                 |
                 v
          BRONZE LAYER
          Raw JSONL Events
                 |
                 v
          SILVER LAYER
       Cleaning & Validation
          Sessionization
                 |
                 v
           GOLD LAYER
       Analytical Datasets
                 |
                 v
             dbt Models
                 |
                 v
           ClickHouse
                 |
                 v
             FastAPI
                 |
                 v
         React Dashboard
```

## Technology Stack

| Technology | Purpose |
|---|---|
| Python | Event generation and data processing |
| Apache Kafka | Streaming event ingestion |
| ClickHouse | Analytical database |
| FastAPI | Backend REST API |
| React.js | Frontend dashboard |
| Vite | Frontend development and build tool |
| Pandas | Data cleaning and transformation |
| Parquet | Processed data storage |
| dbt | SQL transformations and testing |
| Docker | Containerized services |
| SQL | Analytical queries |
| Git & GitHub | Version control |

## Data Pipeline

### 1. Bronze Layer
Stores raw playback events in JSONL format.

### 2. Silver Layer
Cleans and validates incoming events and converts processed data into Parquet format. It also groups events into viewing sessions.

### 3. Gold Layer
Creates analytical datasets, including viewing-session facts and user and content dimensions.

### 4. Analytics Layer
Uses ClickHouse and dbt models to prepare data for analytical queries and dashboard reporting.

## Dashboard

The React dashboard connects to the FastAPI backend and displays:

- Content titles and genres
- Viewing sessions
- Viewer counts
- Estimated watch time
- Content completion percentages
- Backend and database connection status

## Backend API

The FastAPI backend exposes REST endpoints.

| Endpoint | Description |
|---|---|
| `/api/health` | Checks backend and database connectivity |
| `/api/analytics/content` | Returns content engagement analytics |

Interactive API documentation is available at:

`http://localhost:8000/docs`

## Getting Started

### Prerequisites

- Python
- Node.js and npm
- Docker Desktop
- Git

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd project-meridian
```

### 2. Start Docker Services

```bash
docker compose up -d
```

This starts the Kafka and ClickHouse services defined in the Docker Compose configuration.

### 3. Run the Python Consumer

```bash
source venv/bin/activate
python consumer/consumer.py
```

### 4. Run the Event Producer

Open another terminal:

```bash
source venv/bin/activate
python producer/producer.py
```

### 5. Start the Backend

Open another terminal:

```bash
source dbt-venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

### 6. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the dashboard at:

`http://localhost:5173`

## Project Structure

```text
project-meridian/
│
├── producer/
├── consumer/
├── streaming/
├── bronze/
├── silver/
├── gold/
├── batch/
├── features/
├── experiments/
├── dashboard/
├── backend/
├── frontend/
├── dbt/
├── airflow/
├── tests/
├── docker-compose.yml
└── README.md
```

*Note: Some directories represent planned or supporting components and may not contain completed functionality.*

## Future Improvements

- Implement a production-ready personalized recommendation engine.
- Add automated workflow orchestration using Apache Airflow.
- Improve dashboard refresh for continuously arriving events.
- Implement advanced anomaly detection and late-event handling.
- Add monitoring, logging, and deployment automation.
- Improve A/B testing with larger datasets and statistically validated experiments.

## Learning Outcomes

Through Project Meridian, I explored:

- Event-driven data architecture
- Streaming data ingestion using Kafka
- Data engineering and ETL pipelines
- Medallion architecture
- Analytical databases and SQL
- Data modeling using dbt
- REST API development
- Full-stack dashboard integration
- Statistical analysis and A/B testing

## Author

**Rohit Kumar**

GitHub: [rohit01rk](https://github.com/rohit01rk)

---

*Project Meridian – Turning streaming playback events into meaningful insights.*
