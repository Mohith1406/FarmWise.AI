import React, { useState, useEffect } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const NewsFeed = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState("en"); // Default language: English

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const response = await fetch(
                    `https://newsapi.org/v2/everything?q=(agriculture OR farming OR crops OR " sustainable agriculture" OR "organic farming" OR agribusiness OR "food production" OR "farmers")&language=${language}&sortBy=publishedAt&apiKey=${import.meta.env.VITE_NEWS_API}`,
                );
                const data = await response.json();

                // Filter articles to exclude irrelevant topics
                const filteredArticles = data.articles.filter(article =>
                    article.title.toLowerCase().includes("agriculture") ||
                    article.title.toLowerCase().includes("farming") ||
                    article.title.toLowerCase().includes("crop") ||
                    article.title.toLowerCase().includes("telugu") ||
                    article.title.toLowerCase().includes("farmers") ||
                    article.title.toLowerCase().includes("agribusiness")||
                    article.title.toLowerCase().includes("sustainable")
                );

                setArticles(filteredArticles);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching news:", error);
                setLoading(false);
            }
        };

        fetchNews();
    }, [language]); // Refetch when language changes

    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 3,
        slidesToScroll: 1,
        responsive: [
            { breakpoint: 1024, settings: { slidesToShow: 2 } },
            { breakpoint: 768, settings: { slidesToShow: 1 } },
        ],
    };

    return (
        <div className="max-w-5xl mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-green-700">Agriculture News</h1>
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md text-gray-700"
                >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                </select>
            </div>

            {loading ? (
                <p className="text-center text-gray-500">Loading news...</p>
            ) : articles.length > 0 ? (
                <Slider {...settings}>
                    {articles.map((article, index) => (
                        <div key={index} className="px-4">
                            <div className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
                                {article.urlToImage && (
                                    <img src={article.urlToImage} alt="News" className="w-full h-40 object-cover rounded-lg mb-3" />
                                )}
                                <h2 className="text-lg font-semibold text-gray-800">{article.title}</h2>
                                <p className="text-gray-600 mt-2">{article.description}</p>
                                <a 
                                    href={article.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-500 font-medium hover:underline mt-2 inline-block"
                                >
                                    Read more →
                                </a>
                            </div>
                        </div>
                    ))}
                </Slider>
            ) : (
                <p className="text-center text-gray-500">No agriculture articles found.</p>
            )}
        </div>
    );
};

export default NewsFeed;
