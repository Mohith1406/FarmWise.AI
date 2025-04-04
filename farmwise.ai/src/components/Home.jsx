import React from "react";
import Body from "./body/Body.jsx";
import NewsFeed from "./NewsFeed.jsx"
import WeatherForecast from "./Weather.jsx";
const Home = () => {
  return (
    <>
      <Body />
      <NewsFeed/>
      <WeatherForecast/>
    </>
  );
};

export default Home;
