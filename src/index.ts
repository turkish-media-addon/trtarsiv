import { createAddon, runCli } from "@mediaurl/sdk";
import * as cheerio from "cheerio";

interface TrtArsivItem {
    title: string;
    link: string;
    description: string;
}
interface TrtArsivList {
    title: string;
    thumbnail: string;
    link: string;
}


const parseItem = async (
    html: string
): Promise<TrtArsivItem> => {
    const $ = cheerio.load(html);
    const detail = $(".detail");
    const title = detail.find(".head-title").text();
    const video = detail.find("iframe").attr("src") as string;
    const description = detail.find(".paragraph-title").text().toString();

    return {
        title: title,
        link: video,
        description: description
    };
};

const parseList = async (html: string): Promise<TrtArsivList[]> => {
    const results: TrtArsivList[] = [];
    const $ = cheerio.load(html);
    $("div.card-thumbnail").each((index, elem) => {
        const thumbnail = ($(elem)
            .find("img.img-responsive")
            .first()
            .attr("data-src") as string)
            .split("?")
            .shift();

        const item: TrtArsivList = {
            title: $(elem).find("img").first().attr("alt") as string,
            thumbnail: thumbnail || "",
            link: $(elem).find("a").first().attr("href") as string,
        };

        results.push(item);
    });
    return results;
};

export const trtarsivAddon = createAddon({
    id: "trtarsiv",
    name: "Trt Arsiv",
    description: "Trt Arsiv Videos",
    icon: "https://www.trtarsiv.com/images/icons/favicon.png",
    version: "0.1.0",
    itemTypes: ["movie", "series"],
    dashboards: [
        {
            id: "program",
            name: "PROGRAM"
        },
        {
            id: "dizi",
            name: "DİZİ"
        },
        {
            id: "belgesel",
            name: "BELGESEL"
        },
        {
            id: "ozel-video",
            name: "ÖZEL VİDEO"
        },
        {
            id: "cocuk",
            name: "ÇOCUK"
        }
    ],
    catalogs: [
        {
            features: {
                search: { enabled: true }
            },
            options: {
                imageShape: "landscape",
                displayName: true
            },
                        

        }
    ],
    requirements: ["https://www.mediaurl.io/Youtube-resolver"],
});

trtarsivAddon.registerActionHandler("catalog", async (input, ctx) => {
    const { fetch } = ctx;
    const { id } = input; // cagetory get name
    let url = "https://www.trtarsiv.com/";
    if (id) {
        url = url + id; // get category
    } else if (input.search) {
        url = url + "search?query=" + input.search; // get search
    }
    const results = await fetch(url).then(async (resp) => {
        return parseList(await resp.text());
    });

    return {
        nextCursor: null,
        items: results.map((item) => {
            const id = item.link;
            return {
                id,
                ids: { id },
                type: "movie",
                name: `${item.title}`,
                images: {
                    poster: item.thumbnail
                }
            };
        })
    };
});

trtarsivAddon.registerActionHandler("item", async (input, ctx) => {
    const { fetch } = ctx;
    const url = "https://www.trtarsiv.com" + input.ids.id;

    const result = await fetch(url).then(async (resp) =>
        parseItem(await resp.text())
    );

    //video item return
    return {
        type: "movie",
        ids: input.ids,
        name: result.title,
        description: `${result.description}` || "",
        sources: [
            {
                type: "url",
                url: result.link,
                name: result.title
            }
        ],
      
    };
});

runCli([trtarsivAddon], { singleMode: false });
