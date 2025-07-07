// APIキー (config.jsから読み込まれる)
// const API_KEY = 'YOUR_API_KEY_HERE';

// DOM要素の取得
const searchBtn = document.querySelector('.search-btn');
const searchBar = document.querySelector('.search-bar');
const refreshBtn = document.querySelector('.refresh-btn');

const locationEl = document.querySelector('.location');
const dateEl = document.querySelector('.date');
const weatherIconEl = document.querySelector('.weather-icon');
const temperatureEl = document.querySelector('.temperature');
const tempRangeEl = document.querySelector('.temp-range');
const tempHighEl = document.querySelector('.temp-high');
const tempLowEl = document.querySelector('.temp-low');
const weatherDescriptionEl = document.querySelector('.weather-description');
const humidityEl = document.querySelector('.weather-details .detail-item:nth-child(1) .detail-value');
const windEl = document.querySelector('.weather-details .detail-item:nth-child(2) .detail-value');
const pressureEl = document.querySelector('.weather-details .detail-item:nth-child(3) .detail-value');
const hourlyItemsEl = document.querySelector('.hourly-items');
const forecastItemsEl = document.querySelector('.forecast-items');


// --- イベントリスナー ---
searchBtn.addEventListener('click', searchWeather);
searchBar.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchWeather();
    }
});
refreshBtn.addEventListener('click', refreshWeather);
document.addEventListener('DOMContentLoaded', getCurrentLocationWeather);


// --- 関数 ---

/**
 * 都市名で天気を検索する
 */
function searchWeather() {
    const city = searchBar.value.trim();
    if (city) {
        getWeatherData(city);
        searchBar.value = '';
    } else {
        alert('都市名を入力してください。');
    }
}

/**
 * 表示されている都市の天気情報を更新する
 */
function refreshWeather() {
    const city = locationEl.textContent;
    if (city) {
        getWeatherData(city);
    }
}

/**
 * 現在地の天気を取得する
 */
function getCurrentLocationWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            getWeatherData(null, latitude, longitude);
        }, () => {
            // ユーザーが位置情報提供を拒否した場合、デフォルトで東京の天気を表示
            alert('位置情報が取得できませんでした。デフォルトの都市（東京）の天気を表示します。');
            getWeatherData('Tokyo');
        });
    } else {
        // Geolocation APIがサポートされていない場合
        alert('お使いのブラウザは位置情報取得に対応していません。デフォルトの都市（東京）の天気を表示します。');
        getWeatherData('Tokyo');
    }
}


/**
 * OpenWeatherMap APIから天気データを取得する
 * @param {string} city - 都市名
 * @param {number} lat - 緯度
 * @param {number} lon - 経度
 */
async function getWeatherData(city, lat, lon) {
    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
        alert('APIキーが設定されていません。config.jsを確認してください。');
        return;
    }

    const currentWeatherUrl = city 
        ? `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ja`
        : `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ja`;

    const forecastUrl = city
        ? `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=ja`
        : `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ja`;

    try {
        // APIリクエストを並列で実行
        const [currentWeatherResponse, forecastResponse] = await Promise.all([
            fetch(currentWeatherUrl),
            fetch(forecastUrl)
        ]);

        if (!currentWeatherResponse.ok || !forecastResponse.ok) {
            throw new Error('天気情報の取得に失敗しました。都市名が正しいか確認してください。');
        }

        const currentWeatherData = await currentWeatherResponse.json();
        const forecastData = await forecastResponse.json();

        // UIを更新
        updateUI(currentWeatherData, forecastData);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert(error.message);
    }
}

/**
 * 取得したデータでUIを更新する
 * @param {object} current - 現在の天気データ
 * @param {object} forecast - 予報データ
 */
function updateUI(current, forecast) {
    // 1. 現在の天気
    locationEl.textContent = current.name;
    dateEl.textContent = new Date(current.dt * 1000).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
    const weatherId = current.weather[0].id;
    console.log('Current weatherId:', weatherId); // 追加
    weatherIconEl.textContent = getWeatherIcon(weatherId);
    weatherIconEl.className = 'weather-icon'; // classをリセット
    weatherIconEl.classList.add(getWeatherBgClass(weatherId)); // 天気に合わせたclassを追加
    temperatureEl.textContent = `${Math.round(current.main.temp)}°`;
    weatherDescriptionEl.textContent = current.weather[0].description;
    
    // 2. 天気の詳細情報
    humidityEl.textContent = `${current.main.humidity}%`;
    windEl.textContent = `${Math.round(current.wind.speed * 3.6)}km/h`; // m/sからkm/hに変換
    pressureEl.textContent = `${current.main.pressure}hPa`;

    // 3. 3時間ごとの予報 (直近6件)
    hourlyItemsEl.innerHTML = ''; // 中身をクリア
    const hourlyForecasts = forecast.list.slice(0, 6);
    hourlyForecasts.forEach(item => {
        const hour = new Date(item.dt * 1000).getHours();
        const hourlyItemHtml = `
            <div class="hourly-item">
                <div class="hourly-time">${hour}:00</div>
                <div class="hourly-icon">${getWeatherIcon(item.weather[0].id)}</div>
                <div class="hourly-temp">${Math.round(item.main.temp)}°</div>
                <div class="hourly-rain">${Math.round(item.pop * 100)}%</div>
            </div>
        `;
        hourlyItemsEl.innerHTML += hourlyItemHtml;
    });

    // 4. 週間予報 (5日分)
    const dailyForecasts = {};
    forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000).toISOString().split('T')[0];
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = {
                temps: [],
                icons: [],
                weathers: {},
                pops: [] // 降水確率を追加
            };
        }
        dailyForecasts[date].temps.push(item.main.temp);
        dailyForecasts[date].icons.push(item.weather[0].id);
        const weatherId = item.weather[0].id;
        dailyForecasts[date].weathers[weatherId] = (dailyForecasts[date].weathers[weatherId] || 0) + 1;
        dailyForecasts[date].pops.push(item.pop); // 降水確率を追加
    });

    const today = new Date().toISOString().split('T')[0];
    if (dailyForecasts[today]) {
        const todayMax = Math.round(Math.max(...dailyForecasts[today].temps));
        const todayMin = Math.round(Math.min(...dailyForecasts[today].temps));
        tempHighEl.textContent = `最高 ${todayMax}°`;
        tempLowEl.textContent = `最低 ${todayMin}°`;
    }

    forecastItemsEl.innerHTML = ''; // 中身をクリア
    Object.keys(dailyForecasts).slice(1, 5).forEach(date => {
        const dayData = dailyForecasts[date];
        const dayOfWeek = new Date(date).toLocaleDateString('ja-JP', { weekday: 'short' });
        const maxTemp = Math.round(Math.max(...dayData.temps));
        const minTemp = Math.round(Math.min(...dayData.temps));
        const mostFrequentWeatherId = Object.keys(dayData.weathers).reduce((a, b) => dayData.weathers[a] > dayData.weathers[b] ? a : b);
        console.log('Forecast most frequent weatherId for', date, ':', mostFrequentWeatherId); // 追加

        const forecastItemHtml = `
            <div class="forecast-item">
                <div class="forecast-day">${dayOfWeek}</div>
                <div class="forecast-icon">${getWeatherIcon(parseInt(mostFrequentWeatherId))}</div>
                <div class="forecast-temp">${maxTemp}°/${minTemp}°</div>
                <div class="forecast-pop">${Math.round(Math.max(...dayData.pops) * 100)}%</div>
            </div>
        `;
        forecastItemsEl.innerHTML += forecastItemHtml;
    });
}


/**
 * 天気IDに対応する絵文字アイコンを返す
 * @param {number} weatherId - OpenWeatherMapの天気ID
 * @returns {string} 絵文字アイコン
 */
function getWeatherIcon(weatherId) {
    if (weatherId >= 200 && weatherId < 300) return '⛈️'; // 雷雨
    if (weatherId >= 300 && weatherId < 400) return '🌦️'; // 霧雨
    if (weatherId >= 500 && weatherId < 600) return '🌧️'; // 雨
    if (weatherId >= 600 && weatherId < 700) return '❄️'; // 雪
    if (weatherId >= 700 && weatherId < 800) return '🌫️'; // 霧
    if (weatherId === 800) return '☀️'; // 快晴
    if (weatherId === 801) return '🌤️'; // 晴れ時々曇り
    if (weatherId === 802) return '⛅'; // 曇り時々晴れ
    if (weatherId === 803 || weatherId === 804) return '☁️'; // 曇り
    return '❓'; // 不明
}

/**
 * 天気IDに対応する背景色クラスを返す
 * @param {number} weatherId - OpenWeatherMapの天気ID
 * @returns {string} CSSクラス名
 */
function getWeatherBgClass(weatherId) {
    if (weatherId >= 200 && weatherId < 300) return 'stormy';
    if (weatherId >= 300 && weatherId < 600) return 'rainy';
    if (weatherId >= 600 && weatherId < 700) return 'snowy';
    if (weatherId >= 700 && weatherId < 800) return 'misty';
    if (weatherId === 800) return 'sunny';
    if (weatherId > 800) return 'cloudy';
    return 'sunny'; // デフォルト
}