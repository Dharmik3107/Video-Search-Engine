const inputForm = document.getElementById("input-form");
const resultContainer = document.getElementById("videos");
const searchInput = document.getElementById("search-input");
const prevButton = document.getElementById("prev");
const nextButton = document.getElementById("next");
const pageNumber = document.getElementById("page-number");
const videoCards = document.querySelectorAll(".video-card");
const popupContainer = document.querySelector(".popup-container");
const closeButton = document.querySelector(".close-button");

let searchValue, totalResults;
let videoData = [];
let currentStart = 0;

//Change with new keys to overcome issue of query limits
let cxKey = "YOUR CxKey";
let apiKey = "Your API Key";

//! Event Listeners
//Listening for every click closest provided classes
document.addEventListener("click", (event) => {
	const videoCardTarget = event.target.closest(".video-card");
	const closeButton = event.target.closest(".close-button");
	const videoThumbnail = videoCardTarget ? videoCardTarget.querySelector(".video-thumbnail") : null;

	if (videoCardTarget) {
		popupContainer.classList.remove("hide");
		const thumbnailImgSrc = videoThumbnail.querySelector("img").src;
		const videoData = getVideoData(thumbnailImgSrc);
		const embedUrl = videoData.pagemap.videoobject[0].embedurl;
		const videoLink = videoData.link;
		const embedVideoData = previewVideo(embedUrl, videoLink);
		popupContainer.innerHTML = embedVideoData;
	}
	if (closeButton) {
		popupContainer.classList.add("hide");
	}
});

//Listening for input value submission
inputForm.addEventListener("submit", async (event) => {
	event.preventDefault();

	const searchString = event.target.search.value;
	searchValue = searchString;
	totalResults = 0;
	videoData = [];

	if (searchString) {
		resultContainer.innerHTML = "";
		pageNumber.value = 1;
		currentStart = 0;
		if (parseInt(pageNumber.value) === 1) {
			prevButton.classList.add("hide");
			pageNumber.classList.add("hide");
		}

		const videos = await displayVideos(searchString, currentStart.toString());
		videos.forEach((element) => {
			const card = document.createElement("div");
			card.classList.add("video-card");
			card.innerHTML = element;
			resultContainer.appendChild(card);
		});
	} else {
		alert("Type Value in Search Field");
	}
});

//Listening for Search Input change to handle result container
searchInput.addEventListener("input", (event) => {
	const searchString = event.target.value;
	if (searchString === "") resultContainer.innerHTML = "";
});

//Listening for Prev Button click
prevButton.addEventListener("click", async () => {
	try {
		if (searchValue) {
			let currentPage = parseInt(pageNumber.value);
			currentPage = currentPage - 1;
			pageNumber.value = currentPage;
			videoData = [];
			if (currentPage === 1) {
				prevButton.classList.add("hide");
				pageNumber.classList.add("hide");
			}
			resultContainer.innerHTML = "";
			const videos = await displayVideos(searchValue, `${currentPage !== 1 ? `${currentPage - 1}1` : `${currentPage}`}`);
			videos.forEach((element) => {
				const div = document.createElement("div");
				div.classList.add("video-card");
				div.innerHTML = element;
				resultContainer.appendChild(div);
			});
		} else {
			alert("Type Value in Search Field");
		}
	} catch (error) {
		console.log(error.message);
	}
});

//Listening for next button click
nextButton.addEventListener("click", async () => {
	try {
		if (searchValue) {
			resultContainer.innerHTML = "";
			videoData = [];
			let currentPage = parseInt(pageNumber.value);
			console.log(currentPage);
			if (currentPage < totalResults / 10) {
				currentPage = currentPage + 1;
				pageNumber.value = currentPage;
				if (currentPage > 1 && currentPage < 3) {
					prevButton.classList.remove("hide");
					pageNumber.classList.remove("hide");
				}

				const videos = await displayVideos(searchValue, `${currentPage}1`);

				videos.forEach((element) => {
					const div = document.createElement("div");
					div.classList.add("video-card");
					div.innerHTML = element;
					resultContainer.appendChild(div);
				});
			}
		} else {
			alert("Type Value in Search Field");
		}
	} catch (error) {
		console.log(error.message);
	}
});

//! Helper functions
//Function to fetch api anf store data in videoData variable until its length become 10
//*@input -> searchString, startValue
//*@output -> nothing returned
async function fetchPSEApi(searchString, start, cx, apiKey) {
	try {
		const response = await fetch(
			`https://www.googleapis.com/customsearch/v1?q=${searchString}&siteSearch=www.youtube.com/watch&siteSearchFilter=i&key=${apiKey}&cx=${cx}&start=${start}&alt=json`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			}
		);

		//List of 10 videos to show per page
		if (response.status !== 429) {
			const data = await response.json();
			const cardList = data.items;

			cardList?.forEach((item) => {
				if (item.pagemap.videoobject && videoData.length < 10) {
					videoData.push(item);
				} else if (videoData.length === 10) return;
			});

			// Total Results to calculate the number of pages required
			totalResults = parseInt(data.searchInformation.totalResults);

			// If videoData length is less than 10, fetch the next page of results
			if (videoData.length < 10 && currentStart < totalResults - 10) {
				currentStart += 10;
				fetchPSEApi(searchString, currentStart, cx, apiKey);
			}
		} else console.log("query limit exceeded, wait 24 hour to get new quota");
	} catch (error) {
		console.error(error);
	}
}

//Function create video card and calculating duration and view counts
//*@input -> thumbnailLink, videoTitle, creator, viewCount, videoDuration
//*@output -> videocard(string containing video nodes)
function createVideoCard(thumbnailLink, videoTitle, creator, viewCount, videoDuration) {
	let views;

	//Extracting Video Duration from response
	const [minuteString, secondString] = videoDuration.substring(2).replace("M", " ").slice(0, -1).split(" ");
	const minutes = parseInt(minuteString);
	const seconds = parseInt(secondString);
	const duration = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, 0)}`;

	//Calculating views to show based on K/M/B
	let viewNumber = parseInt(viewCount);
	if (viewNumber < 1000) views = `${viewNumber}`;
	if (viewNumber > 1000 && viewNumber < 1000000) views = `${Math.floor(viewNumber / 1000)}K`;
	if (viewNumber > 1000000 && viewNumber < 1000000000) views = `${Math.floor(viewNumber / 1000000)}M`;
	if (viewNumber > 1000000000) views = `${Math.floor(viewNumber / 1000000000)}B`;

	//HTML Video Card to be added on DOM after getting video list from response of API
	const videoCard = `
        <div class="video-thumbnail">
            ${thumbnailLink ? `<img src="${thumbnailLink}" alt="${videoTitle}}"/>` : `<img src="Assets/GrayScaledLogo.svg" alt="GrayScaledLogo"/>`}
            <div class="video-duration">${duration}</div>
        </div>
        <div class="video-details">
            <h1>${videoTitle}</h1>
            <p>${creator}</p>
            <div class="views-section">
                <div class="website">
                    <img src="Assets/Youtube.svg" alt="Youtube Icon">
                    <h6>Youtube.com</h6>
                </div>
                <h6>
                    ${views} views
                </h6>
            </div>
        </div>
    `;
	return videoCard;
}

//Function to create cards based on response and preparing to add in DOM to display videos
//*@input -> searchString, currentStart
//*@output -> Array containing dom nodes
async function displayVideos(searchString, currentStart) {
	try {
		await fetchPSEApi(searchString, currentStart, cxKey, apiKey);
		videoData.sort((a, b) => {
			const countA = parseInt(a.pagemap.videoobject[0].interactioncount);
			const countB = parseInt(b.pagemap.videoobject[0].interactioncount);

			return countB - countA;
		}); // Sorting in descending order
		const cardsList = videoData.map((item) => {
			let pageMap = item.pagemap;
			// const videoDetails = item.pagemap.videoobject !== undefined;
			const videoTitle = pageMap.videoobject[0].name;
			const thumbnailLink = pageMap.cse_thumbnail[0]?.src;
			const creator = pageMap.person[0].name;
			const viewCount = pageMap.videoobject[0]?.interactioncount;
			const videoDuration = pageMap.videoobject[0]?.duration;
			// const videoDetails = item.pagemap.videoobject !== undefined;
			// const videoTitle = videoDetails ? item.pagemap.videoobject[0].name : item.title;
			// const thumbnailLink = item.pagemap.cse_thumbnail[0]?.src || "";
			// const creator = item.pagemap.person !== undefined ? item.pagemap.person[0].name : "Unknown";
			// const viewCount = videoDetails ? item.pagemap.videoobject[0]?.interactioncount : "";
			// const videoDuration = videoDetails ? item.pagemap.videoobject[0]?.duration : "PT0M0S";
			return createVideoCard(thumbnailLink, videoTitle, creator, viewCount, videoDuration);
		});

		return cardsList;
	} catch (error) {
		console.log(error);
	}
}

//Function to preview video based on embed link
//*@input -> embedUrl, videoLink
//*@output -> Dome Node string
function previewVideo(embedUrl, videoLink) {
	const previewCode = `
        <iframe class="iframe-video" src="${embedUrl}" frameborder="0"></iframe>
        <div class="button-container">
            <a href="${videoLink}" target="_blank" class="visit-button">Visit</a>
            <button class="close-button">Close</button>
        </div>
    `;
	return previewCode;
}

//Function to find clicked video card to preview video
//*@input -> thumbnailLink
//*@output -> video data
function getVideoData(thumbnailLink) {
	return videoData.find((data) => data.pagemap.cse_thumbnail[0]?.src === thumbnailLink);
}
