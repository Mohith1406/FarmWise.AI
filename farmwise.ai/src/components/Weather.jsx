import React, { useState, useEffect,useCallback} from "react";
import { useTranslation } from "react-i18next";
import "../i18n.js";
const WeatherForecast = () => {
  const [forecast, setForecast] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDate, setActiveDate] = useState(null);
  const [currentCity, setCurrentCity] = useState("Hyderabad");
  const [locationLoading, setLocationLoading] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [userAllowedLocation, setUserAllowedLocation] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const apiKey = import.meta.env.VITE_WEATHER;  

  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // Function to get user's current location
  const getUserLocation = () => {
    setLocationLoading(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(latitude,longitude)
          setCoordinates({ lat: latitude, lon: longitude });
          setUserAllowedLocation(true);
          setLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setError({
            message: t(
              "location_error",
              "Unable to access your location. Please enable location services."
            )
          });
          setLocationLoading(false);
          setUserAllowedLocation(false);
        }
      );
    } else {
      setError({
        message: t(
          "geolocation_not_supported",
          "Geolocation is not supported by your browser."
        )
      });
      setLocationLoading(false);
    }
  };

  // Function to fetch weather by city name
  const fetchWeatherByCity = useCallback(async (city) => {
    setLoading(true);
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&lang=${lang}&units=metric&APPID=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.cod !== "200") {
        throw new Error(data.message);
      }

      setCurrentCity(data.city.name);
      const groupedData = groupDataByDate(data.list);
      setForecast(groupedData);

      // Set the first date as active by default
      if (Object.keys(groupedData).length > 0 && !activeDate) {
        setActiveDate(Object.keys(groupedData)[0]);
      }
      setError(null);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  },[activeDate,lang])

  // Function to fetch weather by coordinates
  const fetchWeatherByCoords = useCallback(
     async (lat, lon) => {
    setLoading(true);
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&lang=${lang}&units=metric&APPID=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.cod !== "200") {
        throw new Error(data.message);
      }

      setCurrentCity(data.city.name);
      const groupedData = groupDataByDate(data.list);
      setForecast(groupedData);

      // Set the first date as active by default
      if (Object.keys(groupedData).length > 0 && !activeDate) {
        setActiveDate(Object.keys(groupedData)[0]);
      }
      setError(null);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  },[activeDate,lang])

  // Effect for handling coordinate changes
  useEffect(() => {
    if (coordinates) {
      fetchWeatherByCoords(coordinates.lat, coordinates.lon);
    }
  }, [coordinates,fetchWeatherByCoords]);

  // Initial fetch on component mount
  useEffect(() => {
    if (!coordinates) {
      fetchWeatherByCity(currentCity);
    }
  },[lang,fetchWeatherByCity,coordinates,currentCity]);

  const handleCitySearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchWeatherByCity(searchInput);
      setSearchInput("");
    }
  };

  const groupDataByDate = (data) => {
    return data.reduce((acc, curr) => {
      const date = new Date(curr.dt_txt).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(curr);
      return acc;
    }, {});
  };

  const toggleDate = (date) => {
    setActiveDate(date);
  };

  // Get weather condition for summary display
  const getDateSummary = (details) => {
    if (!details || details.length === 0) return null;

    // Get midday forecast or the first available time
    const middayForecast =
      details.find(
        (d) =>
          new Date(d.dt_txt).getHours() >= 12 &&
          new Date(d.dt_txt).getHours() <= 15
      ) || details[0];

    return {
      icon: middayForecast.weather[0].icon,
      temp: Math.round(middayForecast.main.temp),
      description: middayForecast.weather[0].description,
      highTemp: Math.round(Math.max(...details.map((d) => d.main.temp_max))),
      lowTemp: Math.round(Math.min(...details.map((d) => d.main.temp_min)))
    };
  };

  // Get weather icon based on condition and time
  const getWeatherBackground = (iconCode) => {
    const isDay = !iconCode.includes("n");
    const condition = iconCode.slice(0, 2);

    let bgColor = "bg-blue-100";

    switch (condition) {
      case "01": // clear sky
        bgColor = isDay ? "bg-yellow-100" : "bg-indigo-900";
        break;
      case "02": // few clouds
      case "03": // scattered clouds
        bgColor = isDay ? "bg-blue-100" : "bg-indigo-800";
        break;
      case "04": // broken clouds
        bgColor = isDay ? "bg-gray-200" : "bg-gray-700";
        break;
      case "09": // shower rain
      case "10": // rain
        bgColor = isDay ? "bg-blue-200" : "bg-blue-900";
        break;
      case "11": // thunderstorm
        bgColor = isDay ? "bg-purple-200" : "bg-purple-900";
        break;
      case "13": // snow
        bgColor = isDay ? "bg-gray-100" : "bg-gray-800";
        break;
      case "50": // mist
        bgColor = isDay ? "bg-gray-300" : "bg-gray-600";
        break;
      default:
        bgColor = isDay ? "bg-blue-100" : "bg-blue-800";
    }

    return bgColor;
  };

  if (loading && !Object.keys(forecast).length)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">
          {t("weather_Forecast")}
        </h1>

        <div className="w-full md:w-auto mt-4 md:mt-0 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <form onSubmit={handleCitySearch} className="flex w-full sm:w-auto">
            <input
              type="text"
              placeholder={t("Search city...")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600"
            >
              {t("Search")}
            </button>
          </form>

          <button
            onClick={getUserLocation}
            disabled={locationLoading}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg 
              ${
                userAllowedLocation
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            <span>📍</span>
            <span>
              {locationLoading
                ? t("Getting location...")
                : userAllowedLocation
                ? t("Using your location")
                : t("Use my location")}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-center p-3 bg-red-100 text-red-700 rounded-lg">
          <p>{error.message}</p>
        </div>
      )}

      <div className="mb-3 flex items-center">
        <div className="font-medium text-gray-500">{t("Current city")}:</div>
        <div className="ml-2 text-xl font-semibold">{currentCity}</div>
        {loading && (
          <div className="ml-2 animate-spin h-4 w-4 border-t border-blue-500 rounded-full"></div>
        )}
      </div>

      {Object.keys(forecast).length > 0 ? (
        <>
          {/* Date selection tabs */}
          <div className="flex overflow-x-auto space-x-2 pb-2 mb-4">
            {Object.entries(forecast).map(([date, details]) => {
              const summary = getDateSummary(details);
              return (
                <button
                  key={date}
                  onClick={() => toggleDate(date)}
                  className={`flex flex-col items-center p-3 rounded-lg min-w-20 transition-all ${
                    activeDate === date
                      ? "bg-blue-500 text-white shadow-lg transform scale-105"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="font-medium">{date.split(",")[0]}</span>
                  <img
                    src={`http://openweathermap.org/img/w/${summary?.icon}.png`}
                    alt="Weather Icon"
                    className="w-10 h-10"
                  />
                  <div className="font-bold">{summary?.temp}°C</div>
                </button>
              );
            })}
          </div>

          {/* Detailed forecast for selected date */}
          {activeDate && forecast[activeDate] && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-bold">{activeDate}</h2>
                <div className="text-sm text-gray-500">
                  {forecast[activeDate].length} {t("forecast_periods")}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {forecast[activeDate].map((detail, index) => {
                  const time = new Date(detail.dt_txt).toLocaleTimeString(
                    undefined,
                    {
                      hour: "2-digit",
                      minute: "2-digit"
                    }
                  );
                  const bgColor = getWeatherBackground(detail.weather[0].icon);

                  return (
                    <div
                      key={index}
                      className={`rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md ${bgColor}`}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-lg font-bold">{time}</span>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold">
                              {Math.round(detail.main.temp)}°C
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center mb-3">
                          <img
                            src={`http://openweathermap.org/img/w/${detail.weather[0].icon}.png`}
                            alt={detail.weather[0].description}
                            className="w-12 h-12"
                          />
                          <span className="ml-2 text-sm font-medium capitalize">
                            {detail.weather[0].description}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center">
                            <span className="mr-1">🌡️</span>
                            <span>
                              {t("Feels")}: {Math.round(detail.main.feels_like)}
                              °C
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1">💧</span>
                            <span>
                              {t("Humidity")}: {detail.main.humidity}%
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1">💨</span>
                            <span>
                              {t("Wind")}: {Math.round(detail.wind.speed)} km/h
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1">☁️</span>
                            <span>
                              {t("Clouds")}: {detail.clouds.all}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        !loading && (
          <div className="text-center p-6 bg-blue-100 text-blue-700 rounded-lg">
            <p>{t("No forecast data available")}</p>
          </div>
        )
      )}
    </div>
  );
};

export default WeatherForecast;
