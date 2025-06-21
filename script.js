document.addEventListener("DOMContentLoaded", function () {
    loadSeason("Summer 2025"); // Load default season on page load
});

// Anime data
const animeData = {
    "Summer 2025": [
        { 
            title: "Miss Kobayashi's Dragon Maid: A lonely dragon wants to be loved", 
            trailer: "https://www.youtube.com/watch?v=BW6bx31UqAM",
            staffLink: "https://anilist.co/anime/181839/Kobayashisan-Chi-no-Maidragon-Samishii-Gariya-no-Ryuu/staff",
            studios: [
                { name: "Kyoto Animation", id: 2 },
            ]
        },
        { 
            title: "Virgin Punk Part 1: Clockwork Girl (Short movie ~ 35 min long)", 
            trailer: "https://www.youtube.com/watch?v=ccsTlFdH7gc",
            staffLink: "https://anilist.co/anime/181449/Virgin-Punk/staff",
            studios: [{ name: "Shaft", id: 44 }]
        },
        { 
            title: "Shinsei Galverse (1 Episode ~ 30min. June 25th)", 
            trailer: "https://www.youtube.com/watch?v=C5iv4nTUBmY",
            staffLink: "https://anilist.co/anime/192474/Shinsei-Galverse/staff",
            studios: [{ name: "S.o.K", id: 3139 }]
        },
        { 
            title: "Kaiju No. 8 Season 2", 
            trailer: "https://www.youtube.com/watch?v=86pUz-brRJQ",
            staffLink: "https://anilist.co/anime/178754/Kaijuu-8gou-2nd-Season/staff",
            studios: [{ name: "Production I.G", id: 10 }]
        },
        { 
            title: "SAKAMOTO DAYS Part 2", 
            trailer: "https://www.youtube.com/watch?v=i0zHEc5FA54",
            staffLink: "https://anilist.co/anime/184237/SAKAMOTO-DAYS-Part-2/staff",
            studios: [{ name: "TMS Entertainment", id: 73 }]
        },
        { 
            title: "Call of the Night Season 2 (external link for subs)", 
            trailer: "https://www.youtube.com/watch?v=m3yAIWZQ6gM",
            staffLink: "https://anilist.co/anime/175914/Yofukashi-no-Uta-Season-2/staff",
            studios: [{ name: "LIDENFILMS", id: 839 }]
        },
        { 
            title: "The Rising of the Shield Hero Season 4", 
            trailer: "https://www.youtube.com/watch?v=XNzt2ER1o4k",
            staffLink: "https://anilist.co/anime/173780/Tate-no-Yuusha-no-Nariagari-Season-4/staff",
            studios: [{ name: "Kinema Citrus", id: 290 }]
        },
        { 
            title: "Rascal Does Not Dream of Santa Claus", 
            trailer: "https://www.youtube.com/watch?v=H6TPUB0OvyM",
            staffLink: "https://anilist.co/anime/171046/Seishun-Buta-Yarou-wa-Santa-Claus-no-Yume-wo-Minai/staff",
            studios: [{ name: "CloverWorks", id: 1835 }]
        },
        { 
            title: "Grand Blue Season 2", 
            trailer: "https://www.youtube.com/watch?v=rQ119Lo7aF8",
            staffLink: "https://anilist.co/anime/182309/Grand-Blue-Season-2/staff",
            studios: [{ name: "Zero-G", id: 1379 },
                { name: "Liber", id: 2527 }
            ]
        },
        { 
            title: "I Was Reincarnated as the 7th Prince So I Can Take My Time Perfecting My Magical Ability Season 2", 
            trailer: "https://www.youtube.com/watch?v=ifvuDfW0-f8",
            staffLink: "https://anilist.co/anime/178090/Tensei-Shitara-Dai-Nana-Ouji-Dattanode-Kimamani-Majutsu-wo-Kiwamemasu-2nd-Season/staff",
            studios: [{ name: "Tsumugi Akita Animation Lab", id: 2212 }]
        },
        { 
            title: "Rent-a-Girlfriend Season 4 (Split cour)", 
            trailer: "https://www.youtube.com/watch?v=HcPUOXJb4tw",
            staffLink: "https://anilist.co/anime/179344/Kanojo-Okarishimasu-4th-Season/staff",
            studios: [{ name: "TMS Entertainment", id: 73 }]
        },
        { 
            title: "Tougen Anki (2 Cours)", 
            trailer: "https://www.youtube.com/watch?v=j_0eK6R7fm8",
            staffLink: "https://anilist.co/anime/177474/Tougen-Anki/staff",
            studios: [{ name: "Studio Hibari (Lerche)", id: 101 }]
        },
        { 
            title: "CITY THE ANIMATION", 
            trailer: "https://www.youtube.com/watch?v=YP17uvO9amU",
            staffLink: "https://anilist.co/anime/181841/CITY-THE-ANIMATION/staff",
            studios: [
                { name: "Kyoto Animation", id: 2 },
            ]
        },
        { 
            title: "Secrets of the Silent Witch", 
            trailer: "https://www.youtube.com/watch?v=0OBF29HoV4A",
            staffLink: "https://anilist.co/anime/179966/Silent-Witch-Chinmoku-no-Majo-no-Kakushigoto/staff",
            studios: [{ name: "Studio Gokumi", id: 418 }]
        },
        { 
            title: "There's No Freaking Way I'll Be Your Lover! Unless...", 
            trailer: "https://www.youtube.com/watch?v=nEj2X9x9M7Q",
            staffLink: "https://anilist.co/anime/184591/Watashi-ga-Koibito-ni-Nareru-Wake-Naijan-Murimuri-Muri-ja-Nakatta/staff",
            studios: [{ name: "studio MOTHER", id: 2246 }]
        },
        { 
            title: "A Couple of Cuckoos Season 2", 
            trailer: "https://www.youtube.com/watch?v=HuZ-xK-P-aw",
            staffLink: "https://anilist.co/anime/179828/Kakkou-no-Iinazuke-Season-2/staff",
            studios: [{ name: "Okuruto Noboru", id: 2037 }]
        },
        { 
            title: "Takopi's Original Sin (6 Episodes)", 
            trailer: "https://www.youtube.com/watch?v=SQcbntxa4BU",
            staffLink: "https://anilist.co/anime/185407/Takopii-no-Genzai/staff",
            studios: [{ name: "ENISHIYA", id: 1991 }]
        },
        { 
            title: "The Water Magician", 
            trailer: "https://www.youtube.com/watch?v=4E6zDMwB1rw",
            staffLink: "https://anilist.co/anime/186052/Mizu-Zokusei-no-Mahou-Tsukai/staff",
            studios: [{ name: "TYPHOON GRAPHICS", id: 1340 },
                { name: "Wonderland", id: 3060 }
            ]
        },
        { 
            title: "Reborn as a Vending Machine, I Now Wander the Dungeon Season 2", 
            trailer: "https://www.youtube.com/watch?v=Ej_peMlTYiY",
            staffLink: "https://anilist.co/anime/169440/Jidou-Hanbaiki-ni-Umarekawatta-Ore-wa-Meikyuu-wo-Samayou-2nd-Season/staff",
            studios: [{ name: "Studio Gokumi", id: 418 },
                { name: "AXsiZ", id: 1299 }
            ]
        },
        { 
            title: "Apocalypse Bringer Mynoghra", 
            trailer: "https://www.youtube.com/watch?v=eHkO2ftoyao",
            staffLink: "https://anilist.co/anime/178433/Isekai-Mokushiroku-Mynoghra-Hametsu-no-Bunmei-de-Hajimeru-Sekai-Seifuku/staff",
            studios: [{ name: "Maho Film", id: 1978 }]
        },
        { 
            title: "New Saga", 
            trailer: "https://www.youtube.com/watch?v=L8Ce5X4dQtc",
            staffLink: "https://anilist.co/anime/155838/Tsuyokute-New-Saga/staff",
            studios: [{ name: "Sotsu", id: 64 },
                { name: "Studio Clutch", id: 3070 },
                { name: "Studio Massket (Production Assistance)", id: 2411 }
            ]
        },
        { 
            title: "Ruri Rocks", 
            trailer: "https://www.youtube.com/watch?v=fuoe5jWi6gY",
            staffLink: "https://anilist.co/anime/180929/Ruri-no-Houseki/staff",
            studios:  [
                { name: "Studio Bind", id: 1993 },
            ]
        },
        { 
            title: "Solo Camping for Two (Subs timing is slightly off)", 
            trailer: "https://www.youtube.com/watch?v=0c64HTxW_5I",
            staffLink: "https://anilist.co/anime/185965/Futari-Solo-Camp/staff",
            studios: [{ name: "SynergySP", id: 118 }]
        },
        { 
            title: "Dealing with Mikadono Sisters Is a Breeze", 
            trailer: "https://www.youtube.com/watch?v=hBJLgT9Zzh8",
            staffLink: "https://anilist.co/anime/178886/Mikadono-Sanshimai-wa-Angai-Choroi/staff",
            studios: [{ name: "P.A.WORKS", id: 132 }]
        },
        { 
            title: "Watari-kun's ****** Is about to Collapse", 
            trailer: "https://www.youtube.com/watch?v=M_EeQx11NTQ",
            staffLink: "https://anilist.co/anime/169420/Watarikun-no-xx-ga-Houkai-Sunzen/staff",
            studios: [{ name: "Staple Entertainment", id: 2405 }]
        },
        { 
            title: "Bad Girl", 
            trailer: "https://www.youtube.com/watch?v=qtE42u2jKIE",
            staffLink: "https://anilist.co/anime/178675/Bad-Girl/staff",
            studios: [{ name: "Bridge", id: 397 }]
        },
        { 
            title: "Scooped Up by an S-Rank Adventurer!", 
            trailer: "https://www.youtube.com/watch?v=Zv_bcN7whog",
            staffLink: "https://anilist.co/anime/179885/Yuusha-Party-wo-Tsuihou-Sareta-Shiro-Madoushi-S-Rank-Boukensha-ni-Hirowareru-Kono-Shiro-Madoushi-ga-Kikakugaisugiru/staff",
            studios: [{ name: "Felix Film", id: 1440 }]
        },
        { 
            title: "Dekin no Mogura: The Earthbound Mole", 
            trailer: "https://www.youtube.com/watch?v=ex6CDlVVjNI",
            staffLink: "https://anilist.co/anime/184574/Dekin-no-Mogura/staff",
            studios: [{ name: "Brain's Base", id: 112 }]
        },
        { 
            title: "Clevatess", 
            trailer: "https://www.youtube.com/watch?v=sX4o5OODMqQ",
            staffLink: "https://anilist.co/anime/178869/Clevatess-Majuu-no-Ou-to-Akago-to-Kabane-no-Yuusha/staff",
            studios: [
                { name: "Lay-duce", id: 1087 },
            ]
        },
        { 
            title: "With You and the Rain", 
            trailer: "https://www.youtube.com/watch?v=5gpAK94kybU",
            staffLink: "https://anilist.co/anime/180425/Ame-to-Kimi-to/staff",
            studios: [{ name: "Lesprit", id: 1829 }]
        },
        { 
            title: "Hell Teacher: Jigoku Sensei Nube (Remake) (Split cour)", 
            trailer: "https://www.youtube.com/watch?v=IIXbiYuXpbw",
            staffLink: "https://anilist.co/anime/179678/Jigoku-Sensei-Nube-2025/staff",
            studios: [{ name: "Studio KAI", id: 1997 }]
        },
        { 
            title: "Betrothed to My Sister's Ex", 
            trailer: "https://www.youtube.com/watch?v=5SqwRKOGgJs",
            staffLink: "https://anilist.co/anime/179879/Zutaboro-Reijou-wa-Ane-no-Moto-Konyakusha-ni-Dekiai-Sareru/staff",
            studios: [{ name: "LandQ studios", id: 563 }]
        },
        { 
            title: "Cultural Exchange With a Game Center Girl", 
            trailer: "https://www.youtube.com/watch?v=QOVabX4iYYY",
            staffLink: "https://anilist.co/anime/180794/GaCen-Shoujo-to-Ibunka-Kouryuu/staff",
            studios: [{ name: "Nomad", id: 70 }]
        },
        { 
            title: "Nyaight of the Living Cat", 
            trailer: "https://www.youtube.com/watch?v=4REA4evnf5M",
            staffLink: "https://anilist.co/anime/175124/Nyaight-of-the-Living-Cat/staff",
            studios: [{ name: "OLM", id: 28 }]
        },
        { 
            title: "April Showers Bring May Flowers", 
            trailer: "https://www.youtube.com/watch?v=o4k7B3yRAXY",
            staffLink: "https://anilist.co/anime/156395/Busu-ni-Hanataba-wo/staff",
            studios: [{ name: "SILVER LINK.", id: 300 }]
        },
        { 
            title: "Detectives These Days Are Crazy!", 
            trailer: "https://www.youtube.com/watch?v=joAkZeNg9Qk",
            staffLink: "https://anilist.co/anime/180460/Mattaku-Saikin-no-Tantei-to-Kitara/staff",
            studios: [{ name: "LIDENFILMS", id: 839 }]
        },
        { 
            title: "Turkey!", 
            trailer: "https://www.youtube.com/watch?v=nql08ei297A",
            staffLink: "https://anilist.co/anime/159483/Turkey/staff",
            studios: [{ name: "BAKKEN RECORD", id: 1984 }]
        },
        { 
            title: "BULLET/BULLET (Episodes 1-8 on July 16, Episodes 8-12 on August 13)", 
            trailer: "https://www.youtube.com/watch?v=yvom9RjdOlc",
            staffLink: "https://anilist.co/anime/157960/BULLETBULLET/staff",
            studios: [{ name: "E&H Production", id: 2642 }]
        },
        { 
            title: "Private Tutor to the Duke’s Daughter", 
            trailer: "https://www.youtube.com/watch?v=wkhwG86HeeI",
            staffLink: "https://anilist.co/anime/170113/Koujo-Denka-no-Katei-Kyoushi/staff",
            studios: [{ name: "Studio Blanc", id: 478 }]
        },
        { 
            title: "See You Tomorrow at the Food Court (6 Episodes)", 
            trailer: "https://www.youtube.com/watch?v=caqJxV4p-KI",
            staffLink: "https://anilist.co/anime/185519/Food-Court-de-Mata-Ashita/staff",
            studios: [{ name: "Atelier Pontdarc", id: 2298 }]
        },
        { 
            title: "Welcome to the Outcast's Restaurant!", 
            trailer: "https://www.youtube.com/watch?v=kypKGwwyyNA",
            staffLink: "https://anilist.co/anime/185544/Tsuihousha-Shokudou-e-Youkoso/staff",
            studios: [{ name: "OLM (Team Yoshioka)", id: 28 }]
        },
        { 
            title: "Nukitashi (11 Episodes + 4 OVA)", 
            trailer: "https://www.youtube.com/watch?v=yYXy0lrTV18",
            staffLink: "https://anilist.co/anime/174188/Nukitashi-THE-ANIMATION/staff",
            studios: [{ name: "Passione", id: 911 }]
        },
        { 
            title: "The Shy Hero and the Assassin Princesses", 
            trailer: "https://www.youtube.com/watch?v=oCQGQsPxgjQ",
            staffLink: "https://anilist.co/anime/186561/Kizetsu-Yuusha-to-Ansatsu-Hime/staff",
            studios: [{ name: "CONNECT", id: 957 }]
        },
        { 
            title: "Hotel Inhumans", 
            trailer: "https://www.youtube.com/watch?v=mYDorGWL5IE",
            staffLink: "https://anilist.co/anime/184034/Hotel-Inhumans/staff",
            studios: [{ name: "Bridge", id: 397 }]
        },
        { 
            title: "A Married Woman's Lips Taste Like Canned Chu-hai (8 Episodes, airs in a 5-min time slot, uncensored version will be longer)", 
            trailer: "https://www.youtube.com/watch?v=EyiVqPovEcM",
            staffLink: "https://anilist.co/anime/186789/Hitozuma-no-Kuchibiru-wa-Kan-ChuHi-no-Aji-ga-Shite/staff",
            studios: [{ name: "Raiose", id: 3111 }]
        },
        { 
            title: "9-nine- Ruler's Crown", 
            trailer: "https://www.youtube.com/watch?v=DJtmyN2qHdM",
            staffLink: "https://anilist.co/anime/177761/9nine-Shihaisha-no-Oukan/staff",
            studios: [
                { name: "PRA", id: 753 },
            ]
        },
        { 
            title: "Fermat's Cuisine", 
            trailer: "https://www.youtube.com/watch?v=16skR4Srk_g",
            staffLink: "https://anilist.co/anime/186003/Fermat-no-Ryouri/staff",
            studios: [{ name: "domerica", id: 1380 }]
        },
        { 
            title: "KAMITSUBAKI CITY UNDER PRODUCTION", 
            trailer: "https://www.youtube.com/watch?v=6clDlL9yQQY",
            staffLink: "https://anilist.co/anime/173335/Kamitsubakishi-Kensetsuchuu/staff",
            studios: [{ name: "Shogakukan Music & Digital Entertainment", id: 474 }]
        },
        { 
            title: "Leviathan (Probably batch drop)", 
            trailer: "https://www.youtube.com/watch?v=ZOE7PLkuvJM",
            staffLink: "https://anilist.co/anime/177887/Leviathan/staff",
            studios: [{ name: "Orange", id: 1109 }]
        },
        { 
            title: "Let's Go Karaoke! (4 Episodes)", 
            trailer: "https://www.youtube.com/watch?v=RpVYVsBGudQ",
            staffLink: "https://anilist.co/anime/183127/Karaoke-Iko/staff",
            studios: [{ name: "Doga Kobo", id: 95 }]
        },
        { 
            title: "Uglymug, Epicfighter", 
            trailer: "https://www.youtube.com/watch?v=kDdkXDNo-00",
            staffLink: "https://anilist.co/anime/184575/Busamen-Gachi-Fighter/staff",
            studios: [{ name: "WHITE FOX", id: 314 }]
        },
        { 
            title: "Onmyo Kaiten Re:verse (Watch until 1:35 for 1 trailer)", 
            trailer: "https://www.youtube.com/watch?v=15Z5gRNpcII",
            staffLink: "https://anilist.co/anime/187387/Onmyo-Kaiten-Reverse/staff",
            studios: [{ name: "David Production", id: 287 }]
        },
        { 
            title: "Captivated, By You (Starts August 20th, with 4(?) Episodes. No trailer for now)", 
            trailer: "",
            staffLink: "https://anilist.co/anime/183128/Muchuu-sa-Kimi-ni/staff",
            studios: [{ name: "Doga Kobo", id: 95 }]
        },
        { 
            title: "Harmony of Mille-Feuille", 
            trailer: "https://www.youtube.com/watch?v=vD6gGY8ETJI",
            staffLink: "https://anilist.co/anime/166215/Utagoe-wa-MilleFeuille/staff",
            studios: [{ name: "Jumondou", id: 755 }]
        },
        { 
            title: "Necronomico and the Cosmic Horror Show", 
            trailer: "https://www.youtube.com/watch?v=EyI83neN6G8",
            staffLink: "https://anilist.co/anime/185505/Necronomico-no-Cosmic-Horror-Show/staff",
            studios: [{ name: "Studio Gokumi", id: 418 }]
        },

    ],
    "Fall 2025": [
        { 
            title: "Hello Monkey", 
            trailer: "https://www.youtube.com/watch?v=example3",
            staffLink: "https://anilist.co/staff/example3",
            studios: [{ name: "Unknown Studio", id: null }]
        }
    ]
};

// Cache for video iframes
const videoCache = {};

/**
 * Converts trailer URLs (YouTube or Vimeo) to embed format.
 */
function convertToEmbed(url) {
    if (!url) return "";

    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^?&]+)/);
        if (match && match[1]) {
            return `https://www.youtube.com/embed/${match[1]}`;
        }
    }

    // Vimeo
    if (url.includes("vimeo.com")) {
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        if (match && match[1]) {
            return `https://player.vimeo.com/video/${match[1]}`;
        }
    }

    return url; // Return original if not matched
}

/**
 * Loads and displays anime for the selected season without reloading videos.
 */
function loadSeason(season) {
    const animeList = document.getElementById("animeList");

    // Highlight active tab
    document.querySelectorAll(".tab").forEach(tab => {
        tab.classList.toggle("active", tab.textContent === season);
    });

    const selectedAnime = animeData[season] || [];

    // Store existing cards in a map
    const existingCards = Array.from(animeList.getElementsByClassName("anime-card"));
    const existingMap = new Map(existingCards.map(card => [card.getAttribute("data-title"), card]));

    // Track which anime should stay
    const newAnimeSet = new Set(selectedAnime.map(anime => anime.title));

    // Remove anime that are not part of the new season
    existingCards.forEach(card => {
        const title = card.getAttribute("data-title");
        if (!newAnimeSet.has(title)) {
            card.remove();
        }
    });

    // Process new anime list
    selectedAnime.forEach(anime => {
        if (existingMap.has(anime.title)) {
            // Move existing card
            animeList.appendChild(existingMap.get(anime.title));
        } else {
            createAnimeCard(anime, animeList);
        }
    });
}

/**
 * Creates and appends an anime card while reusing existing videos.
 */
function createAnimeCard(anime, animeList) {
    const embedUrl = convertToEmbed(anime.trailer);

    // Get appropriate thumbnail
    let thumbnailUrl;
    const ytId = extractYouTubeId(embedUrl);
    if (ytId) {
        thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    } else if (embedUrl.includes("vimeo.com")) {
        thumbnailUrl = "vimeo-placeholder.jpg";
    } else {
        thumbnailUrl = "default-thumbnail.jpg";
    }

    // Cache iframe
    let iframe;
    if (videoCache[anime.title]) {
        iframe = videoCache[anime.title];
    } else {
        iframe = document.createElement("iframe");
        iframe.src = embedUrl;
        iframe.frameBorder = "0";
        iframe.allowFullscreen = true;
        videoCache[anime.title] = iframe;
    }

    const animeCard = document.createElement("div");
    animeCard.classList.add("anime-card");
    animeCard.setAttribute("data-title", anime.title);

    // HTML structure with iframe-container and video-wrapper
    animeCard.innerHTML = `
        <h3>${anime.title}</h3>
        <div class="iframe-container">
            <div class="video-wrapper">
                <img src="${thumbnailUrl}" alt="${anime.title} thumbnail" class="video-thumbnail" />
            </div>
        </div>
        <div class="anime-links">
            <a href="${anime.staffLink}" target="_blank" class="button">Staff</a>
            <div class="studio-buttons"></div>
        </div>
    `;

    // Replace thumbnail with iframe on click
    const wrapper = animeCard.querySelector(".video-wrapper");
    const thumbnail = animeCard.querySelector(".video-thumbnail");
    thumbnail.addEventListener("click", function () {
        wrapper.innerHTML = ""; // Clear the thumbnail
        wrapper.appendChild(iframe); // Insert cached iframe
    });

    // Add studio buttons
    addStudioButtons(anime, animeCard.querySelector(".studio-buttons"));

    // Append to list
    animeList.appendChild(animeCard);
}

/**
 * Extracts YouTube video ID for thumbnail generation.
 */
function extractYouTubeId(url) {
    const match = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/);
    return match ? match[1] : null;
}

/**
 * Adds studio buttons dynamically.
 */
function addStudioButtons(anime, container) {
    anime.studios.forEach(studio => {
        const button = document.createElement("a");
        button.href = `https://myanimelist.net/anime/producer/${studio.id}`;
        button.target = "_blank";
        button.textContent = studio.name;
        button.classList.add("button");
        container.appendChild(button);
    });
}
