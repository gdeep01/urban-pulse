# How to Deploy Urban Pulse 🚀

The easiest way to deploy this Next.js app is using [Vercel](https://vercel.com).

## Prerequisites

- A [GitHub account](https://github.com) (where your code is hosted)
- A [Vercel account](https://vercel.com/signup)

## Step-by-Step Deployment

1.  **Login to Vercel**
    Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** -> **"Project"**.

2.  **Import Repository**
    Select your `urban-pulse` repository from the list and click **Import**.

3.  **Configure Project**
    Vercel usually auto-detects everything correctly:
    - **Framework Preset**: Next.js
    - **Root Directory**: `./` (default)
    - **Build Command**: `next build` (default)
    - **Output Directory**: `.next` (default)

4.  **Add Environment Variables** (Critical!)
    Expand the **"Environment Variables"** section and add the keys from your `.env.local` file:

    | Key | Value |
    |-----|-------|
    | `NEXT_PUBLIC_SUPABASE_URL` | *your_supabase_url* |
    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *your_supabase_anon_key* |
    | `SUPABASE_SERVICE_ROLE_KEY` | *your_service_role_key* |
    | `TOMTOM_API_KEY` | *your_tomtom_key* |
    | `OPENWEATHERMAP_API_KEY` | *your_openweather_key* |
    | `OPENROUTER_API_KEY` | *your_openrouter_key* |
    | `NEXT_PUBLIC_DEFAULT_CITY_LAT` | 12.9716 |
    | `NEXT_PUBLIC_DEFAULT_CITY_LNG` | 77.5946 |
    | `NEXT_PUBLIC_DEFAULT_CITY_NAME` | Bangalore |

5.  **Deploy**
    Click **Deploy**. Vercel will build your project. In about 1-2 minutes, your dashboard will be live!

## Verification

Once live, verify:
- Map loads correctly (TomTom key working)
- Weather overlay appears (OpenWeatherMap key working)
- "Urban Pulse" score calculates (OpenRouter key working)
