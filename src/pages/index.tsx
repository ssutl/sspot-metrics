import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, differenceInMinutes } from "date-fns";

interface PlantData {
  Conductivity: number;
  Moisture: number;
  Temperature: number;
}

interface ChartData {
  time: string;
  Conductivity: number;
  Moisture: number;
  Temperature: number;
}

export default function Home() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [potIsLive, setPotIsLive] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Initial check
    handleResize();

    // Add event listener for window resize
    window.addEventListener("resize", handleResize);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const plantRef = ref(db, "SSPOTV1");

    signInAnonymously(auth)
      .then(() => {
        console.log("Signed in anonymously");
      })
      .catch((error) => {
        console.error("Error signing in anonymously:", error);
      });

    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User signed in:", user);
        onValue(plantRef, (snapshot) => {
          const data = snapshot.val();
          const formattedData = Object.keys(data).map((timestamp) => ({
            time: timestamp,
            Conductivity: data[timestamp].Conductivity,
            Moisture: data[timestamp].Moisture, // Ensure this key matches the data in your database
            Temperature: data[timestamp].Temperature,
          }));
          setChartData(formattedData);

          // Check if the pot is live
          const latestTimestamp = formattedData[formattedData.length - 1]?.time;
          if (latestTimestamp) {
            const now = new Date();
            const lastUpdate = new Date(latestTimestamp);
            const isLive = differenceInMinutes(now, lastUpdate) <= 20;
            setPotIsLive(isLive);
          }
        });
      } else {
        console.log("User signed out");
      }
    });
  }, [auth, db]);

  const formatXAxis = (tickItem: string) => {
    return format(new Date(tickItem), "dd/MM HH:mm");
  };

  const colour1 = "#ffc100";
  const colour2 = "#FF8D21";
  const colour3 = "#C0CFFA";

  return (
    <main className="w-full h-screen flex flex-col items-center justify-between py-16 px-10">
      <h1>
        <span
          style={{
            color: potIsLive ? "#b8cf69" : "#ff5252",
            fontSize: "1.5rem",
          }}
        >
          ●
        </span>{" "}
        SSPOTV1
      </h1>
      {isMobile ? (
        <>
          {/** write the moisture temp and conductivity in p */}
          <p>
            Conductivity: {chartData[chartData.length - 1]?.Conductivity} us/cm
          </p>
          <p>Moisture: {chartData[chartData.length - 1]?.Moisture}%</p>
          <p>Temperature: {chartData[chartData.length - 1]?.Temperature}°C</p>
          <p>
            Graph is not supported on mobile. Please view on a larger screen.
          </p>
        </>
      ) : (
        <ResponsiveContainer width="100%" height={700}>
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient
                id="colorConductivity"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={colour1} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colour1} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorTemperature" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colour2} stopOpacity={0.95} />
                <stop offset="95%" stopColor={colour2} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colour3} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colour3} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickFormatter={formatXAxis}
              label={{
                value: "Time (dd/MM HH:mm)",
                position: "insideBottomRight",
                offset: -5,
              }}
            />
            <YAxis
              yAxisId="left"
              label={{
                value: "Conductivity (us/cm)",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{
                value: "Moisture (%) & Temperature (°C)",
                angle: 90,
                position: "insideRight",
              }}
            />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="Conductivity"
              stroke={colour1}
              fill="url(#colorConductivity)"
              fillOpacity={0.5}
              yAxisId="left"
            />
            <Area
              type="monotone"
              dataKey="Temperature"
              stroke={colour2}
              fill="url(#colorTemperature)"
              fillOpacity={0.5}
              yAxisId="right"
            />
            <Area
              type="monotone"
              dataKey="Moisture"
              stroke={colour3}
              fill="url(#colorMoisture)"
              fillOpacity={0.5}
              yAxisId="right"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </main>
  );
}
