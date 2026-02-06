# Urban Pulse 

**Urban Pulse** is a real-time city intelligence dashboard that helps you visualize traffic, weather, and public sentiment in one place. I built this to explore how different data streams can come together in an interactive map experience.



##  What it does

- **Live Traffic**: See real-time congestion and traffic flow on an interactive 3D map.
- **Weather & Environment**: accurate weather conditions overlayed directly on the city.
- **Smart Insights**: An "Urban Pulse" score that combines traffic, weather, and sentiment into a simple metric.
- **Predictive Engine**: Tries to forecast near-term city conditions using historical data.
- **City Search**: Easily fly to different locations and get instant analytics.

##  Built With

- **Next.js 14** 
- **TypeScript**
- **Tailwind CSS**
- **Leaflet Maps**
- **Supabase**
- **TanStack Query**

##  Running Locally

1. **Clone the repo**
   ```bash
   git clone https://github.com/gdeep01/urban-pulse.git
   cd urban-pulse
   ```

2. **Install packages**
   ```bash
   npm install
   ```

3. **Setup Environment**
   Rename `.env.example` to `.env.local` and add your API keys:
   ```bash
   cp .env.example .env.local
   ```

4. **Start the app**
   ```bash
   npm run dev
   ```


