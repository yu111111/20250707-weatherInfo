// api/weather.js
export default async function handler(req, res) {
  // Vercelの環境変数からAPIキーを取得
  const API_KEY = process.env.OPENWEATHER_API_KEY; 

  if (!API_KEY) {
    return res.status(500).json({ error: 'APIキーが設定されていません。' });
  }

  // クライアントからのクエリパラメータを取得
  const { city, lat, lon } = req.query; 

  let currentWeatherUrl;
  let forecastUrl;

  if (city) {
    currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ja`;
    forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=ja`;
  } else if (lat && lon) {
    currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ja`;
    forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ja`;
  } else {
    return res.status(400).json({ error: '都市名または緯度・経度が必要です。' });
  }

  try {
    const [currentWeatherResponse, forecastResponse] = await Promise.all([
      fetch(currentWeatherUrl),
      fetch(forecastUrl)
    ]);

    if (!currentWeatherResponse.ok || !forecastResponse.ok) {
      const errorData = await (currentWeatherResponse.ok ? forecastResponse : currentWeatherResponse).json();
      throw new Error(errorData.message || '天気情報の取得に失敗しました。');
    }

    const currentWeatherData = await currentWeatherResponse.json();
    const forecastData = await forecastResponse.json();

    res.status(200).json({ current: currentWeatherData, forecast: forecastData });
  } catch (error) {
    console.error('Error fetching weather data in API route:', error);
    res.status(500).json({ error: error.message });
  }
}