import { apiInitializer } from "discourse/lib/api";

const VIDEO_HOSTS = new Set(["www.bilibili.com", "m.bilibili.com", "bilibili.com"]);
const ARTICLE_HOSTS = new Set(["www.bilibili.com", "m.bilibili.com"]);
const DYNAMIC_HOSTS = new Set(["www.bilibili.com", "m.bilibili.com", "t.bilibili.com"]);
const LIVE_HOSTS = new Set(["live.bilibili.com", "www.live.bilibili.com"]);
const SHORT_HOSTS = new Set(["b23.tv", "www.b23.tv", "bili2233.cn", "www.bili2233.cn"]);
const PLAYER_HOSTS = new Set(["player.bilibili.com"]);
const NETEASE_HOSTS = new Set(["music.163.com", "y.music.163.com"]);
const QQMUSIC_HOSTS = new Set(["y.qq.com", "i.y.qq.com"]);
const ZHIHU_HOSTS = new Set(["zhihu.com", "www.zhihu.com", "zhuanlan.zhihu.com"]);
const WECHAT_HOSTS = new Set(["mp.weixin.qq.com"]);
const BDFZ_POST_HOSTS = new Set(["bdfz.net", "www.bdfz.net"]);
const DOUYIN_HOSTS = new Set(["douyin.com", "www.douyin.com"]);
const DOUYIN_SHARE_HOSTS = new Set(["iesdouyin.com", "www.iesdouyin.com"]);
const DOUYIN_PLAYER_HOSTS = new Set(["open.douyin.com"]);
const BDFZ_POST_AUTO_SCALE_MIN = 0.7;
const BDFZ_POST_AUTO_SCALE_REFERENCE_WIDTH = 800;
const DOUYIN_PLAYER_WIDTH = 324;
const DOUYIN_PLAYER_HEIGHT = 672;
const XIAOHONGSHU_HOSTS = new Set(["xiaohongshu.com", "www.xiaohongshu.com"]);
const REDNOTE_HOSTS = new Set(["rednote.com", "www.rednote.com"]);
const XIAOHONGSHU_SHORT_HOSTS = new Set([
  "xhslink.com",
  "www.xhslink.com",
  "xhslink.cn",
  "www.xhslink.cn",
]);
/* Marxists Internet Archive. www.marxists.org answers with X-Frame-Options:
   SAMEORIGIN, a frame-ancestors 'self' policy, and no CORS header, so a forum page
   can neither frame nor read its documents. Documents therefore stay structured
   source cards, with text supplied only by the operator-run expand-reader service;
   the archive's own audio and video files play through native media elements. PDF
   stays with the official discourse-pdf-previews component. */
const MARXISTS_HOSTS = new Set(["marxists.org", "www.marxists.org"]);
const MARXISTS_AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "oga", "ogg", "wav", "flac"]);
const MARXISTS_VIDEO_EXTENSIONS = new Set(["mp4", "m4v", "webm", "ogv"]);
const MARXISTS_DOWNLOAD_EXTENSIONS = new Set(["epub", "mobi", "azw3"]);
const MARXISTS_DOCUMENT_EXTENSIONS = new Set(["", "htm", "html", "xhtml", "shtml", "txt"]);
const MARXISTS_SECTION_LABELS = {
  archive: "马克思主义文库·著作馆",
  reference: "马克思主义文库·参考馆",
  history: "马克思主义文库·历史馆",
  subject: "马克思主义文库·专题馆",
  glossary: "马克思主义文库·术语库",
  ebooks: "马克思主义文库·电子书库",
  audiobooks: "马克思主义文库·有声书库",
  admin: "马克思主义文库·文库事务",
};
const MARXISTS_GLOSSARY_LABELS = {
  terms: "术语",
  people: "人物",
  events: "事件",
  orgs: "组织",
  places: "地理",
  periodicals: "报刊",
};
const MARXISTS_LANGUAGE_LABELS = {
  arabic: "阿拉伯文",
  bangla: "孟加拉文",
  catala: "加泰罗尼亚文",
  cestina: "捷克文",
  chinese: "中文",
  dansk: "丹麦文",
  deutsch: "德文",
  ellinika: "希腊文",
  esperanto: "世界语",
  espanol: "西班牙文",
  euskara: "巴斯克文",
  farsi: "波斯文",
  francais: "法文",
  hayeren: "亚美尼亚文",
  hebrew: "希伯来文",
  indonesia: "印尼文",
  italiano: "意大利文",
  korean: "朝鲜文",
  kurdi: "库尔德文",
  magyar: "匈牙利文",
  makedonski: "马其顿文",
  nederlands: "荷兰文",
  nihon: "日文",
  norsk: "挪威文",
  polski: "波兰文",
  portugues: "葡萄牙文",
  romana: "罗马尼亚文",
  russkij: "俄文",
  shqip: "阿尔巴尼亚文",
  slovenian: "斯洛文尼亚文",
  suomi: "芬兰文",
  svenska: "瑞典文",
  tagalog: "他加禄文",
  thai: "泰文",
  turkce: "土耳其文",
  urdu: "乌尔都文",
  vietnamese: "越南文",
  xlang: "多语种",
};
const MARXISTS_AUTHOR_NAMES = {
  "adorno": "Theodor Adorno",
  "allende": "Salvador Allende",
  "althusser": "Louis Althusser",
  "bakunin": "Mikhail Bakunin",
  "bebel": "August Bebel",
  "bernal": "J. D. Bernal",
  "bernstein": "Eduard Bernstein",
  "bhagat-singh": "Bhagat Singh",
  "blanqui": "Auguste Blanqui",
  "bloch": "Ernst Bloch",
  "blum": "Leon Blum",
  "bogdanov": "Alexander Bogdanov",
  "bookchin": "Murray Bookchin",
  "bordiga": "Amadeo Bordiga",
  "braverman": "Harry Braverman",
  "bryant": "Louise Bryant",
  "bukharin": "Nikolai Bukharin",
  "cannon": "James Cannon",
  "castoriadis": "Cornelius Castoriadis",
  "castro": "Fidel Castro",
  "caudwell": "Christopher Caudwell",
  "chernyshevsky": "Nicholas Chernyshevsky",
  "cliff": "Tony Cliff",
  "connolly": "James Connolly",
  "debord": "Guy Debord",
  "debs": "Eugene Debs",
  "deleon": "Daniel DeLeon",
  "deutscher": "Isaac Deutscher",
  "dewey": "John Dewey",
  "dietzgen": "Joseph Dietzgen",
  "draper": "Hal Draper",
  "dunayevskaya": "Raya Dunayevskaya",
  "feuerbach": "Ludwig Feuerbach",
  "fourier": "Charles Fourier",
  "freud": "Sigmund Freud",
  "fromm": "Erich Fromm",
  "giap": "Võ Nguyên Giáp",
  "goldman": "Emma Goldman",
  "gomez": "Manuel Gómez",
  "gorter": "Herman Gorter",
  "gramsci": "Antonio Gramsci",
  "guevara": "Che Guevara",
  "haldane": "JBS Haldane",
  "hansen": "Joseph Hansen",
  "harman": "Chris Harman",
  "hegel": "G W F Hegel",
  "hill-christopher": "Christopher Hill",
  "ibarruri": "Dolores Ibárruri",
  "james-clr": "CLR James",
  "jaures": "Jean Jaurès",
  "kamenev": "Leon Kamenev",
  "kautsky": "Karl Kautsky",
  "kollonta": "Alexandra Kollontai",
  "korsch": "Karl Korsch",
  "kropotkin-peter": "Peter Kropotkin",
  "krupskaya": "Nadezhada Krupskaya",
  "labriola": "Antonio Labriola",
  "lafargue": "Paul Lafargue",
  "lassalle": "Ferdinand Lassalle",
  "lenin": "Vladimir Lenin",
  "leontev": "Alexei Leont'ev",
  "levi-paul": "Paul Levi",
  "liebknecht-k": "Karl Liebknecht",
  "liebknecht-w": "Wilhelm Liebknecht",
  "lukacs": "Georg Lukács",
  "lunachar": "Anatoly Lunacharsky",
  "luxemburg": "Rosa Luxemburg",
  "malcolm-x": "Malcolm X",
  "mandel": "Ernest Mandel",
  "mao": "Mao Zedong",
  "marcuse": "Herbert Marcuse",
  "mariateg": "José Carlos Mariátegui",
  "marx": "Karl Marx & Frederick Engels",
  "mattick-paul": "Paul Mattick",
  "miliband": "Ralph Miliband",
  "morris": "William Morris",
  "novack": "George Novack",
  "padmore": "George Padmore",
  "pannekoe": "Anton Pannekoek",
  "pashukanis": "Evgeny Pashukanis",
  "plekhanov": "Georgi Plekhanov",
  "preobrazhensky": "Evgenii Preobrazhensky",
  "radek": "Karl Radek",
  "rakovsky": "Christian Rakovsky",
  "reed": "John Reed",
  "riazanov": "David Riazanov",
  "rosdolsky": "Roman Rosdolsky",
  "roy": "M N Roy",
  "rubin": "Isaak Illich Rubin",
  "ruhle": "Otto Rühle",
  "sartre": "Jean-Paul Sartre",
  "serge": "Victor Serge",
  "shachtma": "Max Shachtman",
  "smith-adam": "Adam Smith",
  "stalin": "Josef Stalin",
  "stirner": "Max Stirner",
  "thompson-ep": "E. P. Thompson",
  "togliatti": "Palmiro Togliatti",
  "trotsky": "Leon Trotsky",
  "vygotsky": "Lev Vygotsky",
  "zetkin": "Clara Zetkin",
  "zinoviev": "Gregory Zinoviev",};
const MARXISTS_CHINESE_AUTHOR_NAMES = {
  "abc": "马克思主义简介",
  "adam-schaff": "亚当·沙夫",
  "adorno": "阿多诺",
  "albums": "图片馆",
  "althusser": "阿尔都塞",
  "babushkin": "巴布石金",
  "bajin": "巴金",
  "bakunin": "巴枯宁",
  "beble": "倍倍尔",
  "bell-hooks": "贝尔·胡克斯",
  "bernstein": "伯恩斯坦",
  "blanqui": "布朗基",
  "bogdanov": "波格丹诺夫",
  "braverman": "布雷弗曼",
  "broue": "勃鲁埃",
  "bukharin": "布哈林",
  "castro": "卡斯特罗",
  "chenbilan": "陈碧兰",
  "chenduxiu": "陈独秀",
  "chenqichang": "陈其昌",
  "clara-zetkin": "蔡特金",
  "communist-international": "第三国际",
  "daniel-bensaid": "本赛德",
  "david-graeber": "大卫·格雷伯",
  "dengzhongxia": "邓中夏",
  "dunayevskaya": "杜娜叶夫斯卡娅",
  "emma-goldman": "爱玛·戈德曼",
  "engels": "恩格斯",
  "ernest-mandel": "曼德尔",
  "first-international": "第一国际",
  "foster": "福斯特",
  "fourth-international": "第四国际",
  "frank": "弗朗克",
  "frank-glass": "李福仁",
  "fromm": "弗洛姆",
  "frunze": "伏龙芝",
  "georg-lukacs": "卢卡奇",
  "gramsci": "葛兰西",
  "guevara": "格瓦拉",
  "harold-r-isaacs": "伊罗生",
  "helphand-parvus": "帕尔乌斯",
  "hobsbawm": "霍布斯鲍姆",
  "isaac-deutcher": "多伊彻",
  "jaures": "饶勒斯",
  "jiangjunyang": "姜君羊",
  "john-reed": "约翰·里德",
  "josef-dietzgen": "约瑟夫·狄慈根",
  "joseph-hansen": "韩生",
  "kamenev": "加米涅夫",
  "kardelj-edvard": "爱德华·卡德尔",
  "kautsky": "考茨基",
  "kollontai": "柯伦泰",
  "korsch-karl": "科尔施",
  "kropotkin": "克鲁泡特金",
  "krupskaya": "克鲁普斯卡娅",
  "kun-bela": "库恩·贝拉",
  "lafargue": "拉法格",
  "laski": "拉斯基",
  "lassalle": "拉萨尔",
  "lenin": "列宁",
  "lenin-cworks": "《列宁全集》",
  "lidazhao": "李大钊",
  "liebknecht-k": "卡尔·李卜克内西",
  "liebknecht-w": "威廉·李卜克内西",
  "linbiao": "林彪",
  "liupingmei": "刘平梅",
  "liushaoqi": "刘少奇",
  "liushifu": "刘师复",
  "louguohua": "楼国华",
  "lunacharsky": "卢那察尔斯基",
  "luoyinong": "罗亦农",
  "luozhanglong": "罗章龙",
  "maitan": "迈坦",
  "makhno": "马赫诺",
  "maozedong": "毛泽东",
  "marcuse": "马尔库塞",
  "markovic": "米·马尔科维奇",
  "marx": "马克思",
  "marx-engels": "《马克思恩格斯全集》",
  "marx-engels2": "《马克思恩格斯文集（十卷）》",
  "miliband": "密利本德",
  "novack": "诺瓦克",
  "otto-bauer": "奥托·鲍威尔",
  "pannekoek": "潘涅库克",
  "paul-levi": "保尔·列维",
  "pengshuzhi": "彭述之",
  "petrovic": "加约·彼得洛维奇",
  "plekhanov": "普列汉诺夫",
  "preobrazhensky": "普列奥布拉任斯基",
  "proudon": "蒲鲁东",
  "quqiubai": "瞿秋白",
  "rakovsky": "拉柯夫斯基",
  "raymond-williams": "威廉斯",
  "riazanov": "梁赞诺夫",
  "rogovin": "罗高文",
  "rosa-luxemburg": "罗莎·卢森堡",
  "roy": "罗易",
  "sartre": "萨特",
  "second-international": "第二国际",
  "shliapnikov": "施略普尼科夫",
  "stalin": "斯大林",
  "sweezy": "斯威齐",
  "tamas": "塔马什",
  "thalmann": "台尔曼",
  "thompson": "汤普森",
  "trotsky": "托洛茨基",
  "vorovsky": "沃罗夫斯基",
  "voznesensky": "沃兹涅先斯基",
  "vranicki": "弗兰尼茨基",
  "wangfanxi": "王凡西",
  "xiangjingyu": "向警予",
  "xieshan": "谢山",
  "xiongandong": "熊安东",
  "yinkuan": "尹宽",
  "yundaiying": "恽代英",
  "zhaofangju": "赵芳举",
  "zhengchaolin": "郑超麟",
  "zhouenlai": "周恩来",
  "zhourensheng": "周仁生",
  "zinoviev": "季诺维也夫",};
const MARXISTS_YEAR_SEGMENT_RE = /^((?:1[5-9]|20)\d{2})(?:-[a-z0-9]{1,4})?$/i;
const MARXISTS_FILENAME_DATE_RE = /(?:^|[-_.])((?:1[5-9]|20)\d{2})(\d{2})?(\d{2})?[a-z]{0,2}$/;
const MARXISTS_CHAPTER_FILE_RE = /^(?:ch|chap|chapter|pt|part)[-_]?0*(\d{1,3})[a-z]?$/i;
const MARXISTS_INDEX_FILE_RE = /^(?:index|default|home|contents?|toc)$/i;
const MARXISTS_OPAQUE_FILENAME_RE = /^(?:marxist\.org|marxists\.org|mia)[-_.]/i;
const MARXISTS_FILE_SEGMENT_RE = /\.[a-z0-9]{1,5}$/i;
const MARXISTS_STRUCTURAL_SLUGS = new Set(["works", "archive", "subject", "reference", "download", "audio", "video", "bio", "photo"]);
const EBOOK_EXTENSIONS = new Set(["epub", "mobi", "azw3"]);
const EBOOK_MIME_TYPES = {
  epub: "application/epub+zip",
  mobi: "application/x-mobipocket-ebook",
  azw3: "application/vnd.amazon.ebook",
};
const VIDEO_PATH_RE = /^\/(?:s\/)?video\/(BV[0-9A-Za-z]+|av\d+)\/?$/i;
const SHORT_VIDEO_PATH_RE = /^\/(?:video\/)?(BV[0-9A-Za-z]+|av\d+)(?:\/p(\d+))?\/?$/i;
const BANGUMI_PATH_RE = /^\/bangumi\/play\/(ep|ss)(\d+)\/?$/i;
const AUDIO_PATH_RE = /^\/audio\/(au|am)(\d+)\/?$/i;
const ARTICLE_PATH_RE = /^\/read\/cv(\d+)\/?$/i;
const OPUS_PATH_RE = /^\/opus\/(\d+)\/?$/i;
const DYNAMIC_PATH_RE = /^\/(\d+)\/?$/i;
const LIVE_PATH_RE = /^\/(?:blanc\/)?(\d+)\/?$/i;
const LIVE_IFRAME_PATH_RE = /^\/blackboard\/live\/live-mobile-playerV3\.html$/i;
const LIVE_IFRAME_FALLBACK_PATH_RE = /^\/blackboard\/live\/live-activity-player\.html$/i;
const BILIBILI_COMPAT_PLAYER_PATH_RE = /^\/blackboard\/webplayer\/mbplayer\.html$/i;
const NETEASE_OUTCHAIN_PATH_RE = /^\/(?:m\/)?outchain\/player$/i;
const QQMUSIC_SONG_DETAIL_PATH_RE = /^\/n\/ryqq\/songDetail\/([A-Za-z0-9]+)\/?$/;
const QQMUSIC_PLAYLIST_PATH_RE = /^\/n\/ryqq\/playlist\/(\d+)\/?$/;
const QQMUSIC_ALBUM_PATH_RE = /^\/n\/ryqq\/albumDetail\/([A-Za-z0-9]+)\/?$/;
const QQMUSIC_TOPLIST_PATH_RE = /^\/n\/ryqq\/toplist\/(\d+)\/?$/;
const QQMUSIC_PLAYSONG_PATH_RE = /^\/v8\/playsong\.html$/;
const QQMUSIC_OUTCHAIN_PATH_RE = /^\/n2\/m\/outchain\/player\/index\.html$/;
const QQMUSIC_SHARE_PLAYLIST_PATH_RE = /^\/n2\/m\/share\/details\/taoge\.html$/;
const ZHIHU_QUESTION_PATH_RE = /^\/question\/(\d+)\/?$/;
const ZHIHU_ANSWER_PATH_RE = /^\/question\/(\d+)\/answer\/(\d+)\/?$/;
const ZHIHU_DIRECT_ANSWER_PATH_RE = /^\/answer\/(\d+)\/?$/;
const ZHIHU_ARTICLE_PATH_RE = /^\/p\/(\d+)\/?$/;
const WECHAT_SHORT_ARTICLE_PATH_RE = /^\/s\/([A-Za-z0-9_-]{6,128})\/?$/;
const BDFZ_POST_PATH_RE = /^\/posts\/([^/]+)\/?$/;
const DOUYIN_VIDEO_PATH_RE = /^\/video\/(\d{15,22})\/?$/;
const DOUYIN_USER_PATH_RE = /^\/user\/([A-Za-z0-9._-]{8,256})\/?$/;
const DOUYIN_SHARE_VIDEO_PATH_RE = /^\/share\/video\/(\d{15,22})\/?$/;
const DOUYIN_PLAYER_PATH_RE = /^\/player\/video\/?$/;
const XIAOHONGSHU_NOTE_PATH_RE = /^\/(?:explore|discovery\/item)\/([0-9a-f]{24})\/?$/i;
const REDNOTE_NOTE_PATH_RE = /^\/explore\/([0-9a-f]{24})\/?$/i;
const XIAOHONGSHU_SHORT_PATH_RE = /^\/(?:a|m|o)\/([A-Za-z0-9_-]{4,})\/?$/i;
const SCHEMELESS_XIAOHONGSHU_RE =
  /^(?:www\.)?(?:xiaohongshu\.com|rednote\.com|xhslink\.(?:com|cn))\//i;
const XIAOHONGSHU_SHARE_CTA_RE = /^打开\s*【小红书】(?:App)?[，,]?.{0,120}$/u;
const XIAOHONGSHU_INLINE_URL_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:xiaohongshu\.com|rednote\.com|xhslink\.(?:com|cn))\/[^\s"'<>，。；！？、（）【】《》「」『』]+/giu;
const XIAOHONGSHU_INLINE_CTA_RE =
  /(?:复制(?:本条|这条)?信息[，,]?\s*)?打开\s*【小红书】(?:App)?[，,]?.*$/u;
const XIAOHONGSHU_UNUSABLE_TITLE_RE =
  /(?:访问的页面不见了|页面不见了|not\s+found|page\s+unavailable|^小红书(?:\s*-\s*小红书)?$)/iu;
const TRAILING_URL_PUNCTUATION_RE = /[)\],.;!?，。；！？、）】》」』]+$/u;
const IFRAME_SRC_RE = /<iframe\b[^>]*\bsrc=(["'])([^"']+)\1/gi;
const URL_LIKE_RE =
  /((?:https?:)?\/\/(?:player\.bilibili\.com\/player\.html|www\.bilibili\.com\/blackboard\/(?:live\/live-mobile-playerV3|live\/live-activity-player|webplayer\/mbplayer)\.html|(?:www\.|m\.)?bilibili\.com\/(?:s\/)?video\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/bangumi\/play\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/audio\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/read\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/opus\/[^\s"'<>]+|t\.bilibili\.com\/[^\s"'<>]+|live\.bilibili\.com\/[^\s"'<>]+|(?:www\.)?(?:b23\.tv|bili2233\.cn)\/[^\s"'<>]+|(?:www\.)?douyin\.com\/(?:video|user)\/[^\s"'<>]+|(?:www\.)?iesdouyin\.com\/share\/video\/[^\s"'<>]+|open\.douyin\.com\/player\/video\?[^\s"'<>]+|(?:y\.)?music\.163\.com\/[^\s"'<>]+|(?:i\.)?y\.qq\.com\/[^\s"'<>]+|(?:www\.)?zhihu\.com\/[^\s"'<>]+|zhuanlan\.zhihu\.com\/[^\s"'<>]+|mp\.weixin\.qq\.com\/[^\s"'<>]+|(?:www\.)?bdfz\.net\/posts\/[^\s"'<>]+|(?:www\.)?marxists\.org\/[^\s"'<>]+))/gi;
const XIAOHONGSHU_URL_LIKE_RE =
  /(?:^|[\s(（\[【{《「『])((?:https?:\/\/)?(?:www\.)?(?:xiaohongshu\.com|rednote\.com|xhslink\.(?:com|cn))\/[^\s"'<>，。；！？、（）【】《》「」『』]+)/gi;
const DEFAULT_ASPECT_RATIO = "16 / 9";
const DOUYIN_PLAYER_ASPECT_RATIO = `${DOUYIN_PLAYER_WIDTH} / ${DOUYIN_PLAYER_HEIGHT}`;
const DEFAULT_EBOOK_READER_HEIGHT = 680;
const DEFAULT_MAX_EBOOK_SIZE_MB = 50;
const BYTES_PER_MEBIBYTE = 1024 * 1024;
const JSONP_TIMEOUT_MS = 8000;
const BILIBILI_STUCK_HELP_DELAY_MS = 5000;
const NETEASE_OUTCHAIN_TYPE_BY_MEDIA = {
  playlist: "0",
  album: "1",
  song: "2",
  program: "3",
  djradio: "4",
};
const NETEASE_MEDIA_BY_OUTCHAIN_TYPE = Object.fromEntries(
  Object.entries(NETEASE_OUTCHAIN_TYPE_BY_MEDIA).map(([mediaType, type]) => [type, mediaType])
);

const themeSettings = typeof settings === "object" && settings ? settings : {};
const wrapperState = new WeakMap();
const videoInfoCache = new Map();
const qqMusicSongInfoCache = new Map();
const themeModulePromises = new Map();
const activeEbookReaders = new Map();
let ebookCleanupObserver = null;

function getBooleanSetting(name, fallback) {
  const value = themeSettings[name];
  return typeof value === "boolean" ? value : fallback;
}

function getIntegerSetting(name, fallback) {
  const value = Number.parseInt(themeSettings[name], 10);
  return Number.isInteger(value) ? value : fallback;
}

function getStringSetting(name, fallback) {
  const value = themeSettings[name];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function getBoundedIntegerSetting(name, fallback, min, max) {
  return Math.min(max, Math.max(min, getIntegerSetting(name, fallback)));
}

function getThemeUploadUrl(name) {
  const value = themeSettings.theme_uploads?.[name];
  return typeof value === "string" && value.length > 0 ? value : "";
}

function buildVideoCanonicalUrl(id, page) {
  const url = new URL(`https://www.bilibili.com/video/${id}`);

  if (page > 1) {
    url.searchParams.set("p", String(page));
  }

  return url.toString();
}

function buildBangumiCanonicalUrl(episodeId, seasonId) {
  if (episodeId) {
    return `https://www.bilibili.com/bangumi/play/ep${episodeId}`;
  }

  return `https://www.bilibili.com/bangumi/play/ss${seasonId}`;
}

function buildLiveCanonicalUrl(roomId) {
  return `https://live.bilibili.com/${roomId}`;
}

function buildAudioCanonicalUrl(audioId, isPlaylist = false) {
  return `https://www.bilibili.com/audio/${isPlaylist ? "am" : "au"}${audioId}`;
}

function buildArticleCanonicalUrl(articleId) {
  return `https://www.bilibili.com/read/cv${articleId}`;
}

function buildOpusCanonicalUrl(opusId) {
  return `https://www.bilibili.com/opus/${opusId}`;
}

function buildDynamicCanonicalUrl(dynamicId) {
  return `https://t.bilibili.com/${dynamicId}`;
}

function buildNetEaseCanonicalUrl(mediaType, itemId) {
  switch (mediaType) {
    case "playlist":
      return `https://music.163.com/playlist?id=${itemId}`;
    case "album":
      return `https://music.163.com/album?id=${itemId}`;
    case "program":
      return `https://music.163.com/program?id=${itemId}`;
    case "djradio":
      return `https://music.163.com/djradio?id=${itemId}`;
    case "song":
    default:
      return `https://music.163.com/song?id=${itemId}`;
  }
}

function buildQQMusicCanonicalUrl(mediaType, itemId) {
  switch (mediaType) {
    case "playlist":
      return `https://y.qq.com/n/ryqq/playlist/${itemId}`;
    case "album":
      return `https://y.qq.com/n/ryqq/albumDetail/${itemId}`;
    case "toplist":
      return `https://y.qq.com/n/ryqq/toplist/${itemId}`;
    case "song":
    default:
      return `https://y.qq.com/n/ryqq/songDetail/${itemId}`;
  }
}

function buildZhihuCanonicalUrl(contentType, ids = {}) {
  if (contentType === "article") {
    return `https://zhuanlan.zhihu.com/p/${ids.articleId}`;
  }

  if (contentType === "answer") {
    return ids.questionId
      ? `https://www.zhihu.com/question/${ids.questionId}/answer/${ids.answerId}`
      : `https://www.zhihu.com/answer/${ids.answerId}`;
  }

  return `https://www.zhihu.com/question/${ids.questionId}`;
}

function normalizeVideoId(rawId) {
  return /^BV/i.test(rawId) ? `BV${rawId.slice(2)}` : `av${rawId.slice(2)}`;
}

function createParsedVideo(rawId, page, extras = {}) {
  const normalizedId = normalizeVideoId(rawId);
  const parsed = {
    provider: "bilibili",
    kind: "video",
    rawId: normalizedId,
    page,
    canonicalUrl: buildVideoCanonicalUrl(normalizedId, page),
    ...extras,
  };

  if (/^BV/i.test(normalizedId)) {
    parsed.bvid = normalizedId;
  } else {
    parsed.aid = normalizedId.slice(2);
  }

  return parsed;
}

function createParsedBangumi({ episodeId = "", seasonId = "", extras = {} }) {
  return {
    provider: "bilibili",
    kind: "bangumi",
    episodeId,
    seasonId,
    page: 1,
    rawId: episodeId ? `ep${episodeId}` : `ss${seasonId}`,
    canonicalUrl: buildBangumiCanonicalUrl(episodeId, seasonId),
    ...extras,
  };
}

function createParsedLive(roomId, extras = {}) {
  return {
    provider: "bilibili",
    kind: "live",
    roomId,
    page: 1,
    rawId: String(roomId),
    canonicalUrl: buildLiveCanonicalUrl(roomId),
    ...extras,
  };
}

function createParsedAudio(audioId, isPlaylist = false, extras = {}) {
  return {
    provider: "bilibili",
    kind: "audio",
    audioId,
    isPlaylist,
    page: 1,
    rawId: `${isPlaylist ? "am" : "au"}${audioId}`,
    canonicalUrl: buildAudioCanonicalUrl(audioId, isPlaylist),
    ...extras,
  };
}

function createParsedArticle(articleId, extras = {}) {
  return {
    provider: "bilibili",
    kind: "article",
    articleId,
    page: 1,
    rawId: `cv${articleId}`,
    canonicalUrl: buildArticleCanonicalUrl(articleId),
    ...extras,
  };
}

function createParsedOpus(opusId, extras = {}) {
  return {
    provider: "bilibili",
    kind: "opus",
    opusId,
    page: 1,
    rawId: String(opusId),
    canonicalUrl: buildOpusCanonicalUrl(opusId),
    ...extras,
  };
}

function createParsedDynamic(dynamicId, extras = {}) {
  return {
    provider: "bilibili",
    kind: "dynamic",
    dynamicId,
    page: 1,
    rawId: String(dynamicId),
    canonicalUrl: buildDynamicCanonicalUrl(dynamicId),
    ...extras,
  };
}

function createParsedNetEase(mediaType, itemId, extras = {}) {
  return {
    provider: "netease",
    kind: "netease",
    mediaType,
    itemId: String(itemId),
    outchainType: NETEASE_OUTCHAIN_TYPE_BY_MEDIA[mediaType],
    page: 1,
    rawId: `${mediaType}:${itemId}`,
    canonicalUrl: buildNetEaseCanonicalUrl(mediaType, itemId),
    ...extras,
  };
}

function createParsedQQMusic(mediaType, itemId, extras = {}) {
  const idType = extras.idType || "mid";
  return {
    provider: "qqmusic",
    kind: "qqmusic",
    mediaType,
    itemId: String(itemId),
    idType,
    page: 1,
    rawId: `${mediaType}:${itemId}`,
    canonicalUrl: buildQQMusicCanonicalUrl(mediaType, itemId),
    ...extras,
  };
}

function createParsedZhihu(contentType, ids = {}, extras = {}) {
  const rawId = ids.answerId || ids.articleId || ids.questionId || "";

  return {
    provider: "zhihu",
    kind: "zhihu",
    contentType,
    questionId: ids.questionId ? String(ids.questionId) : "",
    answerId: ids.answerId ? String(ids.answerId) : "",
    articleId: ids.articleId ? String(ids.articleId) : "",
    page: 1,
    rawId: String(rawId),
    canonicalUrl: buildZhihuCanonicalUrl(contentType, ids),
    ...extras,
  };
}

function createParsedXiaohongshu(contentType, sourceUrl, extras = {}) {
  const isRedNote = REDNOTE_HOSTS.has(sourceUrl.hostname.toLowerCase());

  return {
    provider: "xiaohongshu",
    kind: "xiaohongshu",
    contentType,
    brand: isRedNote ? "rednote" : "xiaohongshu",
    noteId: extras.noteId ? String(extras.noteId) : "",
    page: 1,
    rawId: extras.noteId ? String(extras.noteId) : "share",
    canonicalUrl: sourceUrl.toString(),
    ...extras,
  };
}

function createParsedDouyin(videoId) {
  return {
    provider: "douyin",
    kind: "douyin",
    contentType: "video",
    videoId: String(videoId),
    page: 1,
    rawId: String(videoId),
    canonicalUrl: `https://www.douyin.com/video/${videoId}`,
  };
}

function parsePageNumber(...values) {
  for (const value of values) {
    const page = Number.parseInt(value, 10);

    if (Number.isInteger(page) && page > 0) {
      return page;
    }
  }

  return 1;
}

function parseVideoPageUrl(url) {
  if (!VIDEO_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(VIDEO_PATH_RE);
  if (!match) {
    return null;
  }

  return createParsedVideo(match[1], parsePageNumber(url.searchParams.get("p")));
}

function parseBangumiPageUrl(url) {
  if (!VIDEO_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(BANGUMI_PATH_RE);

  if (!match) {
    return null;
  }

  return match[1].toLowerCase() === "ep"
    ? createParsedBangumi({ episodeId: match[2] })
    : createParsedBangumi({ seasonId: match[2] });
}

function parseLivePageUrl(url) {
  if (!LIVE_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(LIVE_PATH_RE);

  if (!match) {
    return null;
  }

  return createParsedLive(match[1]);
}

function parseAudioPageUrl(url) {
  if (!VIDEO_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(AUDIO_PATH_RE);

  if (!match) {
    return null;
  }

  return createParsedAudio(match[2], match[1].toLowerCase() === "am");
}

function parseArticlePageUrl(url) {
  if (!ARTICLE_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const directMatch = url.pathname.match(ARTICLE_PATH_RE);

  if (directMatch) {
    return createParsedArticle(directMatch[1]);
  }

  if (url.pathname === "/read/mobile" && /^\d+$/.test(url.searchParams.get("id") || "")) {
    return createParsedArticle(url.searchParams.get("id"));
  }

  return null;
}

function parseOpusPageUrl(url) {
  if (!DYNAMIC_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(OPUS_PATH_RE);

  if (!match) {
    return null;
  }

  return createParsedOpus(match[1]);
}

function parseDynamicPageUrl(url) {
  if (url.hostname.toLowerCase() !== "t.bilibili.com") {
    return null;
  }

  const match = url.pathname.match(DYNAMIC_PATH_RE);

  if (!match) {
    return null;
  }

  return createParsedDynamic(match[1]);
}

function parseShortVideoUrl(url) {
  if (!SHORT_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(SHORT_VIDEO_PATH_RE);
  if (!match) {
    return null;
  }

  return createParsedVideo(match[1], parsePageNumber(url.searchParams.get("p"), match[2]), {
    shortUrl: url.toString(),
  });
}

function parsePlayerUrl(url) {
  if (!PLAYER_HOSTS.has(url.hostname.toLowerCase()) || url.pathname !== "/player.html") {
    return null;
  }

  const bvid = url.searchParams.get("bvid");
  const aid = url.searchParams.get("aid");
  const cid = url.searchParams.get("cid");
  const episodeId = url.searchParams.get("episodeId");
  const seasonId = url.searchParams.get("seasonId");

  if (episodeId || seasonId) {
    return createParsedBangumi({
      episodeId: episodeId || "",
      seasonId: seasonId || "",
      extras: {
        officialPlayerUrl: url.toString(),
      },
    });
  }

  if (!bvid && !aid) {
    return null;
  }

  const rawId = bvid || `av${aid}`;
  const parsed = createParsedVideo(rawId, parsePageNumber(url.searchParams.get("p"), url.searchParams.get("page")), {
    officialPlayerUrl: url.toString(),
  });

  if (aid) {
    parsed.aid = aid;
  }

  if (cid) {
    parsed.cid = cid;
  }

  return parsed;
}

function parseLiveIframeUrl(url) {
  if (url.hostname.toLowerCase() !== "www.bilibili.com") {
    return null;
  }

  const isMobilePlayer = LIVE_IFRAME_PATH_RE.test(url.pathname);
  const isActivityPlayer = LIVE_IFRAME_FALLBACK_PATH_RE.test(url.pathname);

  if (!isMobilePlayer && !isActivityPlayer) {
    return null;
  }

  const roomId = url.searchParams.get("roomId") || url.searchParams.get("cid");

  if (!/^\d+$/.test(roomId || "")) {
    return null;
  }

  return createParsedLive(roomId, {
    officialLivePlayerUrl: url.toString(),
    preferMobileLivePlayer: isMobilePlayer,
    activityCid: isActivityPlayer ? roomId : "",
  });
}

function parseCompatPlayerUrl(url) {
  if (url.hostname.toLowerCase() !== "www.bilibili.com" || !BILIBILI_COMPAT_PLAYER_PATH_RE.test(url.pathname)) {
    return null;
  }

  const bvid = url.searchParams.get("bvid");
  const aid = url.searchParams.get("aid");
  const cid = url.searchParams.get("cid");
  const episodeId = url.searchParams.get("episodeId");
  const seasonId = url.searchParams.get("seasonId");

  if (episodeId || seasonId) {
    return createParsedBangumi({
      episodeId: episodeId || "",
      seasonId: seasonId || "",
      extras: {
        compatibilityPlayerUrl: url.toString(),
      },
    });
  }

  if (!bvid && !aid) {
    return null;
  }

  const rawId = bvid || `av${aid}`;
  const parsed = createParsedVideo(rawId, parsePageNumber(url.searchParams.get("p"), url.searchParams.get("page")), {
    compatibilityPlayerUrl: url.toString(),
  });

  if (aid) {
    parsed.aid = aid;
  }

  if (cid) {
    parsed.cid = cid;
  }

  return parsed;
}

function normalizeNetEaseRoutePath(pathname) {
  if (!pathname) {
    return "/";
  }

  if (pathname.startsWith("/m/")) {
    return pathname.slice(2);
  }

  return pathname;
}

function parseNetEaseRoute(routeUrl) {
  const pathname = normalizeNetEaseRoutePath(routeUrl.pathname);
  const id = routeUrl.searchParams.get("id");

  if (!/^\d+$/.test(id || "")) {
    return null;
  }

  switch (pathname) {
    case "/song":
      return createParsedNetEase("song", id);
    case "/playlist":
      return createParsedNetEase("playlist", id);
    case "/album":
      return createParsedNetEase("album", id);
    case "/program":
      return createParsedNetEase("program", id);
    case "/dj":
    case "/djradio":
      return createParsedNetEase("djradio", id);
    default:
      return null;
  }
}

function parseNetEaseOutchainUrl(url) {
  if (url.hostname.toLowerCase() !== "music.163.com" || !NETEASE_OUTCHAIN_PATH_RE.test(url.pathname)) {
    return null;
  }

  const mediaType = NETEASE_MEDIA_BY_OUTCHAIN_TYPE[url.searchParams.get("type") || ""];
  const itemId = url.searchParams.get("id");

  if (!mediaType || !/^\d+$/.test(itemId || "")) {
    return null;
  }

  const height = Number.parseInt(url.searchParams.get("height"), 10);

  return createParsedNetEase(mediaType, itemId, {
    officialPlayerUrl: url.toString(),
    outchainHeight: Number.isInteger(height) && height > 0 ? height : null,
  });
}

function parseNetEasePageUrl(url) {
  if (!NETEASE_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const outchainParsed = parseNetEaseOutchainUrl(url);
  if (outchainParsed) {
    return outchainParsed;
  }

  const directParsed = parseNetEaseRoute(url);
  if (directParsed) {
    return directParsed;
  }

  if (url.hash?.startsWith("#/")) {
    try {
      const hashRoute = new URL(`https://music.163.com${url.hash.slice(1)}`);
      return parseNetEaseRoute(hashRoute);
    } catch {
      return null;
    }
  }

  return null;
}

function parseQQMusicPageUrl(url) {
  const hostname = url.hostname.toLowerCase();

  if (!QQMUSIC_HOSTS.has(hostname)) {
    return null;
  }

  if (hostname === "i.y.qq.com") {
    if (QQMUSIC_OUTCHAIN_PATH_RE.test(url.pathname)) {
      const songid = url.searchParams.get("songid");

      if (songid && /^\d+$/.test(songid)) {
        return createParsedQQMusic("song", songid, {
          idType: "id",
          officialPlayerUrl: url.toString(),
        });
      }

      return null;
    }

    if (QQMUSIC_PLAYSONG_PATH_RE.test(url.pathname)) {
      const songmid = url.searchParams.get("songmid");

      if (songmid && /^[A-Za-z0-9]{8,}$/.test(songmid)) {
        return createParsedQQMusic("song", songmid, { idType: "mid" });
      }

      const songid = url.searchParams.get("songid");

      if (songid && /^\d+$/.test(songid) && songid !== "0") {
        return createParsedQQMusic("song", songid, { idType: "id" });
      }

      return null;
    }

    if (QQMUSIC_SHARE_PLAYLIST_PATH_RE.test(url.pathname)) {
      const id = url.searchParams.get("id");

      if (id && /^\d+$/.test(id)) {
        return createParsedQQMusic("playlist", id, { idType: "id" });
      }

      return null;
    }

    return null;
  }

  const songMatch = url.pathname.match(QQMUSIC_SONG_DETAIL_PATH_RE);

  if (songMatch) {
    return createParsedQQMusic("song", songMatch[1], { idType: "mid" });
  }

  const playlistMatch = url.pathname.match(QQMUSIC_PLAYLIST_PATH_RE);

  if (playlistMatch) {
    return createParsedQQMusic("playlist", playlistMatch[1], { idType: "id" });
  }

  const albumMatch = url.pathname.match(QQMUSIC_ALBUM_PATH_RE);

  if (albumMatch) {
    return createParsedQQMusic("album", albumMatch[1], { idType: "mid" });
  }

  const toplistMatch = url.pathname.match(QQMUSIC_TOPLIST_PATH_RE);

  if (toplistMatch) {
    return createParsedQQMusic("toplist", toplistMatch[1], { idType: "id" });
  }

  return null;
}

function parseZhihuPageUrl(url) {
  const hostname = url.hostname.toLowerCase();

  if (
    !ZHIHU_HOSTS.has(hostname) ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port
  ) {
    return null;
  }

  const answerMatch = url.pathname.match(ZHIHU_ANSWER_PATH_RE);

  if (answerMatch) {
    return createParsedZhihu("answer", {
      questionId: answerMatch[1],
      answerId: answerMatch[2],
    });
  }

  const questionMatch = url.pathname.match(ZHIHU_QUESTION_PATH_RE);

  if (questionMatch) {
    return createParsedZhihu("question", { questionId: questionMatch[1] });
  }

  const directAnswerMatch = url.pathname.match(ZHIHU_DIRECT_ANSWER_PATH_RE);

  if (directAnswerMatch) {
    return createParsedZhihu("answer", { answerId: directAnswerMatch[1] });
  }

  const articleMatch = url.pathname.match(ZHIHU_ARTICLE_PATH_RE);

  if (articleMatch) {
    return createParsedZhihu("article", { articleId: articleMatch[1] });
  }

  return null;
}

function parseWeChatPageUrl(url) {
  const hostname = url.hostname.toLowerCase();

  if (
    !WECHAT_HOSTS.has(hostname) ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && url.port !== "80" && url.port !== "443")
  ) {
    return null;
  }

  const shortMatch = url.pathname.match(WECHAT_SHORT_ARTICLE_PATH_RE);
  let sourceIdentity = "";

  if (shortMatch) {
    sourceIdentity = `wechat:short:${shortMatch[1]}`;
  } else if (url.pathname.replace(/\/+$/, "") === "/s") {
    const biz = (url.searchParams.get("__biz") || "").trim();
    const mid = (url.searchParams.get("mid") || "").trim();
    const idx = (url.searchParams.get("idx") || "1").trim();

    if (!biz || !/^\d+$/.test(mid) || !/^\d+$/.test(idx)) {
      return null;
    }

    sourceIdentity = `wechat:article:${biz}:${mid}:${idx}`;
  } else {
    return null;
  }

  const canonical = new URL(url.toString());
  canonical.protocol = "https:";
  canonical.hostname = "mp.weixin.qq.com";
  canonical.port = "";
  canonical.hash = "";

  return {
    provider: "wechat",
    kind: "wechat",
    contentType: "article",
    page: 1,
    rawId: canonical.pathname,
    sourceIdentity,
    canonicalUrl: canonical.toString(),
  };
}

function parseBdfzPostUrl(url) {
  const hostname = url.hostname.toLowerCase();

  if (
    !BDFZ_POST_HOSTS.has(hostname) ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && url.port !== "80" && url.port !== "443")
  ) {
    return null;
  }

  const match = url.pathname.match(BDFZ_POST_PATH_RE);
  const slug = match?.[1] || "";

  if (!slug || slug.toLowerCase() === "page" || slug.toLowerCase() === "index.xml") {
    return null;
  }

  const canonical = new URL(url.toString());
  canonical.protocol = "https:";
  canonical.hostname = "bdfz.net";
  canonical.port = "";
  canonical.pathname = `/posts/${slug}/`;
  canonical.search = "";
  canonical.hash = "";

  return {
    provider: "bdfz-post",
    kind: "bdfz-post",
    contentType: "article",
    page: 1,
    rawId: slug,
    canonicalUrl: canonical.toString(),
  };
}

function isSafeXiaohongshuSourceUrl(url) {
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === "443")
  );
}

function isSafeDouyinSourceUrl(url) {
  return (
    ["http:", "https:"].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === "443")
  );
}

function parseDouyinPageUrl(url) {
  const hostname = url.hostname.toLowerCase();

  if (
    !DOUYIN_HOSTS.has(hostname) &&
    !DOUYIN_SHARE_HOSTS.has(hostname) &&
    !DOUYIN_PLAYER_HOSTS.has(hostname)
  ) {
    return null;
  }

  if (!isSafeDouyinSourceUrl(url)) {
    return null;
  }

  if (DOUYIN_HOSTS.has(hostname)) {
    const videoMatch = url.pathname.match(DOUYIN_VIDEO_PATH_RE);

    if (videoMatch) {
      return createParsedDouyin(videoMatch[1]);
    }

    const modalIds = url.searchParams.getAll("modal_id");

    if (
      url.pathname.match(DOUYIN_USER_PATH_RE) &&
      modalIds.length === 1 &&
      /^\d{15,22}$/.test(modalIds[0])
    ) {
      return createParsedDouyin(modalIds[0]);
    }

    return null;
  }

  if (DOUYIN_SHARE_HOSTS.has(hostname)) {
    const shareMatch = url.pathname.match(DOUYIN_SHARE_VIDEO_PATH_RE);
    return shareMatch ? createParsedDouyin(shareMatch[1]) : null;
  }

  const playerIds = url.searchParams.getAll("vid");

  if (
    url.pathname.match(DOUYIN_PLAYER_PATH_RE) &&
    playerIds.length === 1 &&
    /^\d{15,22}$/.test(playerIds[0])
  ) {
    return createParsedDouyin(playerIds[0]);
  }

  return null;
}

function parseXiaohongshuPageUrl(url) {
  const hostname = url.hostname.toLowerCase();

  if (!XIAOHONGSHU_HOSTS.has(hostname) && !REDNOTE_HOSTS.has(hostname)) {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  url.protocol = "https:";

  if (!isSafeXiaohongshuSourceUrl(url)) {
    return null;
  }

  const match = url.pathname.match(
    REDNOTE_HOSTS.has(hostname) ? REDNOTE_NOTE_PATH_RE : XIAOHONGSHU_NOTE_PATH_RE
  );

  if (!match) {
    return null;
  }

  return createParsedXiaohongshu("note", url, { noteId: match[1] });
}

function parseXiaohongshuShortUrl(url) {
  if (!XIAOHONGSHU_SHORT_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  url.protocol = "https:";

  if (!isSafeXiaohongshuSourceUrl(url)) {
    return null;
  }

  const match = url.pathname.match(XIAOHONGSHU_SHORT_PATH_RE);

  if (!match) {
    return null;
  }

  return createParsedXiaohongshu("share", url, { shortCode: match[1] });
}

function isSafeMarxistsSourceUrl(url) {
  return (
    ["http:", "https:"].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === "80" || url.port === "443")
  );
}

function buildMarxistsCanonicalUrl(url) {
  const canonical = new URL(url.toString());

  canonical.protocol = "https:";
  canonical.hostname = "www.marxists.org";
  canonical.port = "";

  return canonical.toString();
}

function decodeUrlSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function getMarxistsExtension(url) {
  return getUrlFilename(url).match(/\.([a-z0-9]{1,5})$/i)?.[1]?.toLowerCase() || "";
}

function getMarxistsContentType(extension) {
  if (MARXISTS_AUDIO_EXTENSIONS.has(extension)) {
    return "audio";
  }

  if (MARXISTS_VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  if (MARXISTS_DOWNLOAD_EXTENSIONS.has(extension)) {
    return "download";
  }

  return MARXISTS_DOCUMENT_EXTENSIONS.has(extension) ? "document" : "";
}

function humanizeMarxistsSlug(slug) {
  const text = String(slug || "")
    .replace(MARXISTS_FILE_SEGMENT_RE, "")
    .replace(/[-_+]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || /^[\d\s]+$/.test(text)) {
    return "";
  }

  return text.replace(/(^|\s)([a-z])/g, (match, lead, letter) => `${lead}${letter.toUpperCase()}`);
}

function describeMarxistsPath(pathname) {
  const segments = pathname.split("/").filter(Boolean).map(decodeUrlSegment);
  const [first = "", second = "", third = ""] = segments;
  const namedSegment = (segment) => (MARXISTS_FILE_SEGMENT_RE.test(segment) ? "" : segment);
  const descriptor = {
    section: "",
    language: "",
    authorSlug: "",
    topic: "",
    year: "",
    month: "",
    day: "",
    workSlug: "",
    chapter: "",
    filename: segments.at(-1) || "",
  };

  if (first === "archive") {
    descriptor.section = "archive";
    descriptor.authorSlug = namedSegment(second);
  } else if (first === "reference") {
    descriptor.section = "reference";
    descriptor.authorSlug = second === "archive" ? namedSegment(third) : "";
    descriptor.topic = second === "subject" ? namedSegment(third) : "";
  } else if (first === "glossary") {
    descriptor.section = "glossary";
    descriptor.topic = namedSegment(second);
  } else if (first === "history" || first === "subject") {
    descriptor.section = first;
    descriptor.topic = namedSegment(second);
  } else if (first === "ebooks" || first === "audiobooks" || first === "admin") {
    descriptor.section = first;
  } else if (MARXISTS_LANGUAGE_LABELS[first]) {
    descriptor.section = "language";
    descriptor.language = first;
    descriptor.authorSlug = namedSegment(second);
  }

  for (const segment of segments) {
    const yearMatch = segment.match(MARXISTS_YEAR_SEGMENT_RE);

    if (yearMatch) {
      descriptor.year = yearMatch[1];
      break;
    }
  }

  const stem = descriptor.filename.replace(MARXISTS_FILE_SEGMENT_RE, "");
  const dateMatch = stem.match(MARXISTS_FILENAME_DATE_RE);

  if (dateMatch) {
    const month = Number.parseInt(dateMatch[2] || "", 10);
    const day = Number.parseInt(dateMatch[3] || "", 10);

    descriptor.year = descriptor.year || dateMatch[1];

    if (descriptor.year === dateMatch[1]) {
      descriptor.month = month >= 1 && month <= 12 ? String(month) : "";
      descriptor.day = descriptor.month && day >= 1 && day <= 31 ? String(day) : "";
    }
  }

  const chapterMatch = stem.match(MARXISTS_CHAPTER_FILE_RE);

  if (chapterMatch) {
    descriptor.chapter = chapterMatch[1];
  }

  const parentSlug = segments.length > 1 ? segments.at(-2) : "";
  const candidateWorkSlug =
    MARXISTS_INDEX_FILE_RE.test(stem) || chapterMatch || MARXISTS_OPAQUE_FILENAME_RE.test(stem)
      ? parentSlug
      : stem;

  if (
    candidateWorkSlug &&
    candidateWorkSlug !== descriptor.authorSlug &&
    candidateWorkSlug !== descriptor.topic &&
    candidateWorkSlug !== descriptor.language &&
    !MARXISTS_STRUCTURAL_SLUGS.has(candidateWorkSlug.toLowerCase()) &&
    !MARXISTS_YEAR_SEGMENT_RE.test(candidateWorkSlug)
  ) {
    descriptor.workSlug = candidateWorkSlug;
  }

  return descriptor;
}

function getMarxistsSectionLabel(descriptor) {
  if (descriptor.section === "language") {
    const language = MARXISTS_LANGUAGE_LABELS[descriptor.language];

    if (descriptor.language === "chinese") {
      return "中文马克思主义文库";
    }

    return language ? `马克思主义文库·${language}` : "马克思主义文库";
  }

  if (descriptor.section === "glossary") {
    const topic = MARXISTS_GLOSSARY_LABELS[descriptor.topic];

    return topic ? `${MARXISTS_SECTION_LABELS.glossary}·${topic}` : MARXISTS_SECTION_LABELS.glossary;
  }

  return MARXISTS_SECTION_LABELS[descriptor.section] || "马克思主义文库";
}

function getMarxistsAuthorName(descriptor) {
  if (!descriptor.authorSlug) {
    return "";
  }

  const slug = descriptor.authorSlug.toLowerCase();
  const authored =
    descriptor.language === "chinese"
      ? MARXISTS_CHINESE_AUTHOR_NAMES[slug]
      : MARXISTS_AUTHOR_NAMES[slug];

  return authored || humanizeMarxistsSlug(slug);
}

function getMarxistsWorkTitle(descriptor) {
  const slug = descriptor.workSlug;

  if (!/[-_]/.test(slug) && !/[\u4e00-\u9fff]/u.test(slug)) {
    return "";
  }

  const title = humanizeMarxistsSlug(slug);

  return title.length > 0 && title.length <= 80 ? title : "";
}

function getMarxistsDateText(descriptor) {
  if (!descriptor.year) {
    return "";
  }

  return [
    `${descriptor.year}年`,
    descriptor.month ? `${descriptor.month}月` : "",
    descriptor.day ? `${descriptor.day}日` : "",
  ].join("");
}

function createParsedMarxists(url, contentType, extension) {
  const descriptor = describeMarxistsPath(url.pathname);

  return {
    provider: "marxists",
    kind: "marxists",
    contentType,
    format: extension,
    section: descriptor.section,
    sectionLabel: getMarxistsSectionLabel(descriptor),
    language: descriptor.language,
    authorSlug: descriptor.authorSlug,
    authorName: getMarxistsAuthorName(descriptor),
    workTitle: getMarxistsWorkTitle(descriptor),
    dateText: getMarxistsDateText(descriptor),
    chapter: descriptor.chapter,
    filename: descriptor.filename,
    page: 1,
    rawId: url.pathname,
    canonicalUrl: buildMarxistsCanonicalUrl(url),
  };
}

function parseMarxistsUrl(url) {
  if (!MARXISTS_HOSTS.has(url.hostname.toLowerCase()) || !isSafeMarxistsSourceUrl(url)) {
    return null;
  }

  const extension = getMarxistsExtension(url);

  if (extension === "pdf") {
    return null;
  }

  const contentType = getMarxistsContentType(extension);

  return contentType ? createParsedMarxists(url, contentType, extension) : null;
}

function isMarxistsMedia(parsed) {
  return parsed?.kind === "marxists" && ["audio", "video"].includes(parsed.contentType);
}

function isMarxistsInlineMedia(parsed) {
  return isMarxistsMedia(parsed) && getBooleanSetting("enable_marxists_inline_media", true);
}

function isMarxistsReadingCard(parsed) {
  return parsed?.kind === "marxists" && !isMarxistsMedia(parsed);
}

function isReaderCard(parsed) {
  return isMarxistsReadingCard(parsed) || ["zhihu", "wechat"].includes(parsed?.kind);
}

function getMarxistsMetaLine(parsed) {
  switch (parsed.contentType) {
    case "audio":
      return "马克思主义文库·音频";
    case "video":
      return "马克思主义文库·影像";
    case "download":
      return `马克思主义文库·${parsed.format.toUpperCase()}`;
    default:
      return parsed.sectionLabel || "马克思主义文库";
  }
}

function getMarxistsFallbackTitle(parsed) {
  if (parsed.contentType === "audio" || parsed.contentType === "video" || parsed.contentType === "download") {
    return humanizeMarxistsSlug(parsed.filename) || parsed.filename || getMarxistsMetaLine(parsed);
  }

  return parsed.workTitle || parsed.authorName || parsed.sectionLabel || "马克思主义文库";
}

function getMarxistsDescription(parsed) {
  const shownElsewhere = new Set([getMarxistsFallbackTitle(parsed), getMarxistsMetaLine(parsed)]);
  const parts = [
    parsed.authorName,
    parsed.dateText,
    parsed.chapter ? `第 ${parsed.chapter} 章` : "",
    parsed.sectionLabel,
  ];

  return [...new Set(parts.filter((part) => part && !shownElsewhere.has(part)))].join(" · ");
}

function getMarxistsFooterMeta(parsed) {
  if (isMarxistsMedia(parsed)) {
    return isMarxistsInlineMedia(parsed) ? "文库原始音视频 · 浏览器直接播放" : "在马克思主义文库播放";
  }

  if (parsed.contentType === "download") {
    return `马克思主义文库 ${parsed.format.toUpperCase()} 原文件`;
  }

  if (supportsExpandReader(parsed)) {
    return "原文经 BDFZ 阅读服务展开 · 该站禁止页面被外部内嵌";
  }

  return "马克思主义文库原文卡片 · 该站禁止页面被外部内嵌";
}

function normalizeUrlLikeString(value, { trimTrailingPunctuation = false } = {}) {
  if (typeof value !== "string") {
    return "";
  }

  const raw = value.trim();
  const trimmed = trimTrailingPunctuation ? raw.replace(TRAILING_URL_PUNCTUATION_RE, "") : raw;

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (SCHEMELESS_XIAOHONGSHU_RE.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

function getUrlFilename(url) {
  const rawName = url.pathname.split("/").filter(Boolean).at(-1) || "";

  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function parseEbookAttachmentUrl(href) {
  let url;

  try {
    url = new URL(
      normalizeUrlLikeString(href),
      globalThis.location?.href || "https://forum.invalid/"
    );
  } catch {
    return null;
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    return null;
  }

  const filename = getUrlFilename(url);
  const extension = filename.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "";

  if (!EBOOK_EXTENSIONS.has(extension)) {
    return null;
  }

  return {
    provider: "ebook",
    kind: "ebook",
    format: extension,
    filename,
    page: 1,
    rawId: filename,
    canonicalUrl: url.toString(),
  };
}

function parseBilibiliUrl(href) {
  let url;

  try {
    url = new URL(normalizeUrlLikeString(href));
  } catch {
    return null;
  }

  return (
    parseVideoPageUrl(url) ||
    parseBangumiPageUrl(url) ||
    parseLivePageUrl(url) ||
    parseAudioPageUrl(url) ||
    parseArticlePageUrl(url) ||
    parseOpusPageUrl(url) ||
    parseDynamicPageUrl(url) ||
    parseShortVideoUrl(url) ||
    parsePlayerUrl(url) ||
    parseLiveIframeUrl(url) ||
    parseCompatPlayerUrl(url) ||
    parseNetEasePageUrl(url) ||
    parseQQMusicPageUrl(url) ||
    parseZhihuPageUrl(url) ||
    parseWeChatPageUrl(url) ||
    parseBdfzPostUrl(url) ||
    parseDouyinPageUrl(url) ||
    parseXiaohongshuPageUrl(url) ||
    parseXiaohongshuShortUrl(url) ||
    parseMarxistsUrl(url)
  );
}

function buildIframeUrl(parsed) {
  if (parsed.kind === "douyin") {
    return buildDouyinIframeUrl(parsed, getBooleanSetting("autoplay_on_click", true));
  }

  if (parsed.kind === "qqmusic") {
    return buildQQMusicIframeUrl(parsed, getBooleanSetting("autoplay_on_click", true));
  }

  if (parsed.kind === "netease") {
    return buildNetEaseIframeUrl(parsed, getBooleanSetting("autoplay_on_click", true));
  }

  if (parsed.kind === "bangumi") {
    const params = new URLSearchParams();

    if (parsed.episodeId) {
      params.set("episodeId", String(parsed.episodeId));
    }

    if (parsed.seasonId) {
      params.set("seasonId", String(parsed.seasonId));
    }

    if (getBooleanSetting("autoplay_on_click", true)) {
      params.set("autoplay", "1");
    }

    return `https://player.bilibili.com/player.html?${params.toString()}`;
  }

  if (parsed.kind === "live") {
    return buildLiveIframeUrl(parsed);
  }

  const params = new URLSearchParams({
    isOutside: "true",
    page: String(parsed.page),
    as_wide: "1",
    high_quality: "1",
  });

  if (getBooleanSetting("autoplay_on_click", true)) {
    params.set("autoplay", "1");
  }

  if (parsed.bvid) {
    params.set("bvid", parsed.bvid);
  }

  if (parsed.aid) {
    params.set("aid", String(parsed.aid));
  }

  if (parsed.cid) {
    params.set("cid", String(parsed.cid));
  }

  return `https://player.bilibili.com/player.html?${params.toString()}`;
}

function buildNoAutoplayIframeUrl(parsed) {
  if (parsed.kind === "douyin") {
    return buildDouyinIframeUrl(parsed, false);
  }

  if (parsed.kind === "qqmusic") {
    return buildQQMusicIframeUrl(parsed, false);
  }

  if (parsed.kind === "netease") {
    return buildNetEaseIframeUrl(parsed, false);
  }

  if (parsed.kind === "bangumi") {
    const params = new URLSearchParams();

    if (parsed.episodeId) {
      params.set("episodeId", String(parsed.episodeId));
    }

    if (parsed.seasonId) {
      params.set("seasonId", String(parsed.seasonId));
    }

    return `https://player.bilibili.com/player.html?${params.toString()}`;
  }

  const isVideoLike = parsed.kind === "video" || (!parsed.kind && (parsed.bvid || parsed.aid));

  if (!isVideoLike) {
    return "";
  }

  const params = new URLSearchParams({
    isOutside: "true",
    page: String(parsed.page),
    as_wide: "1",
    high_quality: "1",
  });

  if (parsed.bvid) {
    params.set("bvid", parsed.bvid);
  }

  if (parsed.aid) {
    params.set("aid", String(parsed.aid));
  }

  if (parsed.cid) {
    params.set("cid", String(parsed.cid));
  }

  return `https://player.bilibili.com/player.html?${params.toString()}`;
}

function buildLiveIframeUrl(parsed) {
  const liveId = String(parsed.activityCid || parsed.roomId);
  const shouldPreferActivityPlayer =
    !parsed.preferMobileLivePlayer && (/^\d{7,}$/.test(liveId) || Boolean(parsed.activityCid));

  if (shouldPreferActivityPlayer) {
    const params = new URLSearchParams({
      cid: liveId,
      quality: "1",
      entrance: "1",
      reload: "1",
      danmaku: getBooleanSetting("enable_live_danmaku", true) ? "1" : "0",
      fullscreen: "1",
      send: "0",
      recommend: "0",
      logo: "0",
      mute: "0",
      enableCtrlUI: "1",
      enableAutoPlayTips: "1",
    });

    return `https://www.bilibili.com/blackboard/live/live-activity-player.html?${params.toString()}`;
  }

  const params = new URLSearchParams({
    roomId: String(parsed.roomId),
    danmaku: getBooleanSetting("enable_live_danmaku", true) ? "1" : "0",
  });

  return `https://www.bilibili.com/blackboard/live/live-mobile-playerV3.html?${params.toString()}`;
}

function getNetEaseEmbedHeight(parsed) {
  if (Number.isInteger(parsed.outchainHeight) && parsed.outchainHeight > 0) {
    return parsed.outchainHeight;
  }

  return parsed.mediaType === "song" || parsed.mediaType === "program" ? 130 : 430;
}

function getQQMusicEmbedHeight(parsed) {
  return parsed.idType === "id" ? 86 : 430;
}

function buildQQMusicIframeUrl(parsed, autoplay) {
  if (parsed.mediaType !== "song") {
    return "";
  }

  if (parsed.idType === "id") {
    return `https://i.y.qq.com/n2/m/outchain/player/index.html?songid=${parsed.itemId}&songtype=0`;
  }

  const params = new URLSearchParams({
    songmid: parsed.itemId,
    songtype: "0",
  });

  if (autoplay) {
    params.set("autoplay", "1");
  }

  return `https://i.y.qq.com/v8/playsong.html?${params.toString()}`;
}

function buildNetEaseIframeUrl(parsed, autoplay) {
  const params = new URLSearchParams({
    type: parsed.outchainType,
    id: String(parsed.itemId),
    auto: autoplay ? "1" : "0",
    height: String(getNetEaseEmbedHeight(parsed)),
  });

  const basePath = getClientEnvironment().isMobileLike
    ? "https://music.163.com/m/outchain/player"
    : "https://music.163.com/outchain/player";

  return `${basePath}?${params.toString()}`;
}

function buildDouyinIframeUrl(parsed, autoplay) {
  const params = new URLSearchParams({
    vid: String(parsed.videoId),
    autoplay: autoplay ? "1" : "0",
  });

  return `https://open.douyin.com/player/video?${params.toString()}`;
}

function parseFirstSupportedUrl(...hrefs) {
  for (const href of hrefs) {
    if (!href) {
      continue;
    }

    const parsed = parseBilibiliUrl(href);

    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function extractUrlsFromText(text) {
  if (typeof text !== "string" || text.length === 0) {
    return [];
  }

  const urls = [];

  for (const match of text.matchAll(IFRAME_SRC_RE)) {
    urls.push(normalizeUrlLikeString(match[2]));
  }

  for (const match of text.matchAll(URL_LIKE_RE)) {
    urls.push(normalizeUrlLikeString(match[1], { trimTrailingPunctuation: true }));
  }

  for (const match of text.matchAll(XIAOHONGSHU_URL_LIKE_RE)) {
    urls.push(normalizeUrlLikeString(match[1], { trimTrailingPunctuation: true }));
  }

  return [...new Set(urls.filter(Boolean))];
}

function getMetaLine(parsed) {
  switch (parsed.kind) {
    case "video":
      return parsed.page > 1 ? `视频 · P${parsed.page}` : "视频";
    case "bangumi":
      return parsed.episodeId ? "番剧" : "番剧";
    case "live":
      return "直播";
    case "audio":
      return parsed.isPlaylist ? "音频歌单" : "音频";
    case "article":
      return "专栏";
    case "opus":
      return "动态";
    case "dynamic":
      return "动态";
    case "netease":
      return getNetEaseMetaLine(parsed);
    case "qqmusic":
      return getQQMusicMetaLine(parsed);
    case "zhihu":
      return getZhihuMetaLine(parsed);
    case "wechat":
      return "微信公号全文";
    case "bdfz-post":
      return "BDFZ 博文全文";
    case "douyin":
      return "抖音视频";
    case "xiaohongshu":
      return getXiaohongshuMetaLine(parsed);
    case "marxists":
      return getMarxistsMetaLine(parsed);
    case "ebook":
      return `${parsed.format.toUpperCase()} 电子书`;
    default:
      return "bilibili";
  }
}

function getQQMusicMetaLine(parsed) {
  switch (parsed.mediaType) {
    case "playlist":
      return "QQ音乐歌单";
    case "album":
      return "QQ音乐专辑";
    case "toplist":
      return "QQ音乐排行榜";
    case "song":
    default:
      return "QQ音乐单曲";
  }
}

function getNetEaseMetaLine(parsed) {
  switch (parsed.mediaType) {
    case "playlist":
      return "网易云歌单";
    case "album":
      return "网易云专辑";
    case "program":
      return "网易云播客节目";
    case "djradio":
      return "网易云播客";
    case "song":
    default:
      return "网易云单曲";
  }
}

function getZhihuMetaLine(parsed) {
  switch (parsed.contentType) {
    case "answer":
      return "知乎回答";
    case "article":
      return "知乎专栏";
    case "question":
    default:
      return "知乎问题";
  }
}

function getXiaohongshuMetaLine(parsed) {
  if (parsed.brand === "rednote") {
    return "RedNote 笔记";
  }

  return parsed.contentType === "note" ? "小红书笔记" : "小红书分享";
}

function formatCompactCount(value) {
  const count = Number(value);

  if (!Number.isFinite(count) || count < 0) {
    return "";
  }

  if (count >= 100000000) {
    const scaled = count / 100000000;
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, "")}亿`;
  }

  if (count >= 10000) {
    const scaled = count / 10000;
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, "")}万`;
  }

  return Math.round(count).toLocaleString("zh-CN");
}

function getPreviewStatText(parsed, viewCount = null) {
  switch (parsed.kind) {
    case "video": {
      const parts = [];

      if (Number.isFinite(Number(viewCount))) {
        parts.push(`${formatCompactCount(viewCount)} 播放`);
      }

      if (parsed.page > 1) {
        parts.push(`P${parsed.page}`);
      }

      return parts.join(" · ") || "视频";
    }
    case "bangumi":
      return parsed.episodeId ? `番剧 · EP${parsed.episodeId}` : "番剧";
    case "live":
      return "直播";
    case "audio":
    case "article":
    case "opus":
    case "dynamic":
      return getMetaLine(parsed);
    case "netease":
    case "qqmusic":
    case "zhihu":
    case "wechat":
    case "bdfz-post":
    case "douyin":
    case "xiaohongshu":
    case "marxists":
      return getMetaLine(parsed);
    case "ebook":
      return getMetaLine(parsed);
    default:
      return "";
  }
}

function getClientEnvironment() {
  const userAgent = (globalThis.navigator?.userAgent || "").toLowerCase();
  const platform = (globalThis.navigator?.platform || "").toLowerCase();
  const maxTouchPoints = globalThis.navigator?.maxTouchPoints || 0;
  const isIPadOSDesktop = /mac/.test(platform) && maxTouchPoints > 1;
  const isIOS = /iphone|ipad|ipod/.test(userAgent) || isIPadOSDesktop;
  const isAndroid = /android/.test(userAgent);
  const isMobileLike = isIOS || isAndroid;

  return {
    userAgent,
    platform,
    maxTouchPoints,
    isIPadOSDesktop,
    isIOS,
    isAndroid,
    isMobileLike,
  };
}

function detectEmbedEnvironmentRisk(provider = "bilibili") {
  if (provider !== "bilibili") {
    return {
      level: "none",
      message: "",
    };
  }

  const { userAgent, isIOS } = getClientEnvironment();
  const isInAppBrowser =
    /micromessenger|weibo|qq\/|qqbrowser|aliapp|dingtalk|baiduboxapp|toutiao|newsarticle/.test(userAgent);
  const isAndroidWebView = /; wv\)/.test(userAgent) || /\bversion\/[\d.]+ chrome\/[\d.]+ mobile safari\/[\d.]+\b/.test(userAgent);

  if (isInAppBrowser || isAndroidWebView) {
    return {
      level: "hard",
      message: "当前内置浏览器对 bilibili 第三方播放器兼容性较差，优先在 B 站打开更稳。",
    };
  }

  if (isIOS) {
    return {
      level: "soft",
      message: "当前设备上 bilibili iframe 可能被降级，如遇卡住请改用 B 站打开。",
    };
  }

  return {
    level: "none",
    message: "",
  };
}

function getFallbackTitle(parsed) {
  switch (parsed.kind) {
    case "video":
      return parsed.bvid || (parsed.aid ? `av${parsed.aid}` : parsed.rawId);
    case "bangumi":
      return parsed.episodeId ? `番剧 EP${parsed.episodeId}` : `番剧 SS${parsed.seasonId}`;
    case "live":
      return `直播间 ${parsed.roomId}`;
    case "audio":
      return parsed.isPlaylist ? `音频歌单 am${parsed.audioId}` : `音频 au${parsed.audioId}`;
    case "article":
      return `专栏 cv${parsed.articleId}`;
    case "opus":
      return `动态 opus ${parsed.opusId}`;
    case "dynamic":
      return `动态 ${parsed.dynamicId}`;
    case "netease":
      return getNetEaseFallbackTitle(parsed);
    case "qqmusic":
      return getQQMusicFallbackTitle(parsed);
    case "zhihu":
      return getZhihuFallbackTitle(parsed);
    case "wechat":
      return "微信公号文章";
    case "bdfz-post":
      return "BDFZ 博文";
    case "douyin":
      return `抖音视频 ${parsed.videoId}`;
    case "xiaohongshu":
      return getXiaohongshuMetaLine(parsed);
    case "marxists":
      return getMarxistsFallbackTitle(parsed);
    case "ebook":
      return parsed.filename || `${parsed.format.toUpperCase()} 电子书`;
    default:
      return parsed.rawId || "bilibili";
  }
}

function getQQMusicFallbackTitle(parsed) {
  switch (parsed.mediaType) {
    case "playlist":
      return `QQ音乐歌单 ${parsed.itemId}`;
    case "album":
      return `QQ音乐专辑 ${parsed.itemId}`;
    case "toplist":
      return `QQ音乐排行榜 ${parsed.itemId}`;
    case "song":
    default:
      return `QQ音乐单曲 ${parsed.itemId}`;
  }
}

function getNetEaseFallbackTitle(parsed) {
  switch (parsed.mediaType) {
    case "playlist":
      return `网易云歌单 ${parsed.itemId}`;
    case "album":
      return `网易云专辑 ${parsed.itemId}`;
    case "program":
      return `网易云播客节目 ${parsed.itemId}`;
    case "djradio":
      return `网易云播客 ${parsed.itemId}`;
    case "song":
    default:
      return `网易云单曲 ${parsed.itemId}`;
  }
}

function getZhihuFallbackTitle(parsed) {
  switch (parsed.contentType) {
    case "answer":
      return parsed.questionId
        ? `知乎回答 ${parsed.questionId}/${parsed.answerId}`
        : `知乎回答 ${parsed.answerId}`;
    case "article":
      return `知乎专栏 ${parsed.articleId}`;
    case "question":
    default:
      return `知乎问题 ${parsed.questionId}`;
  }
}

function shouldAutoExpandXiaohongshu(parsed) {
  return (
    parsed?.kind === "xiaohongshu" &&
    getBooleanSetting("auto_expand_embeds", true) &&
    getBooleanSetting("enable_xiaohongshu_inline_page", true)
  );
}

function shouldAutoExpandEmbed(parsed) {
  return getBooleanSetting("auto_expand_embeds", true) && isKnownInlineKind(parsed);
}

function isKnownInlineKind(parsed) {
  if (parsed.kind === "ebook") {
    return getBooleanSetting("enable_ebook_reader", true);
  }

  if (parsed.kind === "xiaohongshu") {
    return shouldAutoExpandXiaohongshu(parsed);
  }

  if (parsed.kind === "bdfz-post") {
    return getBooleanSetting("enable_bdfz_posts_inline", true);
  }

  if (parsed.kind === "douyin") {
    return true;
  }

  if (parsed.kind === "marxists") {
    return isMarxistsInlineMedia(parsed);
  }

  if (parsed.kind === "video" || parsed.kind === "bangumi" || parsed.kind === "netease") {
    return true;
  }

  if (parsed.kind === "qqmusic" && parsed.mediaType === "song") {
    return true;
  }

  if (parsed.kind === "live") {
    return getBooleanSetting("enable_experimental_live_embed", true);
  }

  return false;
}

function getInitialButtonLabel(parsed) {
  if (parsed.provider === "ebook" && isKnownInlineKind(parsed)) {
    return "打开阅读";
  }

  if (parsed.provider === "xiaohongshu" && isKnownInlineKind(parsed)) {
    return "展开笔记";
  }

  if (parsed.provider === "bdfz-post" && isKnownInlineKind(parsed)) {
    return "展开正文";
  }

  if (isMarxistsInlineMedia(parsed)) {
    return parsed.contentType === "video" ? "播放影像" : "播放录音";
  }

  return isKnownInlineKind(parsed) ? getStringSetting("button_label", "点击播放") : getOpenLabel(parsed);
}

function shouldShowDirectSourceLink(parsed) {
  return (
    parsed?.provider === "xiaohongshu" ||
    parsed?.provider === "wechat" ||
    parsed?.provider === "bdfz-post" ||
    parsed?.provider === "douyin" ||
    parsed?.provider === "ebook" ||
    parsed?.provider === "marxists" ||
    getBooleanSetting("show_open_link", true)
  );
}

function getLoadedOpenLabel(parsed) {
  if (parsed?.provider === "xiaohongshu") {
    return parsed.brand === "rednote" ? "页面空白时在 RedNote 打开" : "页面空白时在小红书打开";
  }

  return getOpenLabel(parsed);
}

function getFooterMeta(parsed) {
  switch (parsed.kind) {
    case "video":
    case "bangumi":
      return getPreviewStatText(parsed);
    case "live":
      return getBooleanSetting("enable_experimental_live_embed", true) ? getLiveFooterMeta(parsed) : "在 bilibili 打开";
    case "audio":
      return "在 bilibili 打开";
    case "article":
      return "在 bilibili 打开";
    case "opus":
    case "dynamic":
      return "在 bilibili 打开";
    case "netease":
      return getNetEaseFooterMeta(parsed);
    case "qqmusic":
      return getQQMusicFooterMeta(parsed);
    case "zhihu":
      return supportsExpandReader(parsed)
        ? "知乎官方摘要经 BDFZ 阅读服务展开 · 完整内容请打开原文"
        : "知乎原文卡片";
    case "wechat":
      return supportsWeChatArchive(parsed)
        ? "经 wx.bdfz.net 转换并默认展开全文 · 保留微信原文"
        : "微信原文卡片";
    case "bdfz-post":
      return getBooleanSetting("enable_bdfz_posts_inline", true)
        ? "bdfz.net 原文 · 默认展开，可随时收起"
        : "bdfz.net 原文链接";
    case "douyin":
      return "抖音开放平台播放器 · 保留原视频链接";
    case "xiaohongshu":
      if (parsed.brand === "rednote") {
        return "RedNote 原文卡片";
      }

      return parsed.contentType === "share" ? "小红书分享链接" : "小红书原文卡片";
    case "marxists":
      return getMarxistsFooterMeta(parsed);
    case "ebook":
      return "浏览器本地阅读 · 不上传第三方";
    default:
      return "bilibili";
  }
}

function getQQMusicFooterMeta() {
  return "QQ音乐外链播放器";
}

function isCompactQQMusic(parsed) {
  return parsed.kind === "qqmusic" && parsed.mediaType === "song";
}

function isCompactAudio(parsed) {
  return isCompactNetEase(parsed) || isCompactQQMusic(parsed);
}

function isCompactNetEase(parsed) {
  return parsed.kind === "netease" && (parsed.mediaType === "song" || parsed.mediaType === "program");
}

function getNetEaseFooterMeta() {
  return "网易云外链播放器";
}

function getLiveFooterMeta(parsed) {
  const liveId = String(parsed.activityCid || parsed.roomId);
  const usesActivityPlayer = !parsed.preferMobileLivePlayer && (/^\d{7,}$/.test(liveId) || Boolean(parsed.activityCid));

  return usesActivityPlayer ? "直播嵌入播放器" : "直播播放器";
}

function getOpenLabel(parsed) {
  if (parsed.provider === "ebook") {
    return "下载原文件";
  }

  if (parsed.provider === "xiaohongshu") {
    return parsed.brand === "rednote" ? "前往 RedNote 查看" : "前往小红书查看";
  }

  if (parsed.provider === "zhihu") {
    return "在知乎打开";
  }

  if (parsed.provider === "wechat") {
    return "在微信打开原文";
  }

  if (parsed.provider === "bdfz-post") {
    return "在 bdfz.net 打开原文";
  }

  if (parsed.provider === "douyin") {
    return "在抖音打开";
  }

  if (parsed.provider === "marxists") {
    return parsed.contentType === "download" ? "下载原文件" : "在马克思主义文库打开";
  }

  if (parsed.provider === "qqmusic") {
    return "在QQ音乐打开";
  }

  return parsed.provider === "netease" ? "在网易云音乐打开" : "在 bilibili 打开";
}

function getEmbedTitle(parsed) {
  if (parsed.provider === "ebook") {
    return `${parsed.format.toUpperCase()} ebook reader`;
  }

  if (parsed.provider === "xiaohongshu") {
    return parsed.brand === "rednote" ? "RedNote source page" : "Xiaohongshu source page";
  }

  if (parsed.provider === "zhihu") {
    return "Zhihu page";
  }

  if (parsed.provider === "wechat") {
    return "WeChat article archive";
  }

  if (parsed.provider === "bdfz-post") {
    return "BDFZ post";
  }

  if (parsed.provider === "douyin") {
    return "Douyin player";
  }

  if (parsed.provider === "marxists") {
    return "Marxists Internet Archive";
  }

  if (parsed.provider === "qqmusic") {
    return "QQ Music player";
  }

  return parsed.provider === "netease" ? "NetEase Cloud Music player" : "bilibili player";
}

function loadCallbackScript(src, options = {}) {
  const { callbackParam = "callback", extraParams = {} } = options;

  return new Promise((resolve, reject) => {
    const callbackName = `__bili_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const requestUrl = new URL(src, globalThis.location?.href || "https://forum.invalid/");
    let settled = false;

    const cleanup = () => {
      settled = true;
      script.remove();

      try {
        delete window[callbackName];
      } catch {
        window[callbackName] = undefined;
      }
    };

    const timeout = window.setTimeout(() => {
      if (settled) {
        return;
      }

      cleanup();
      reject(new Error("bilibili metadata request timed out"));
    }, JSONP_TIMEOUT_MS);

    window[callbackName] = (payload) => {
      if (settled) {
        return;
      }

      window.clearTimeout(timeout);
      cleanup();
      resolve(payload);
    };

    for (const [key, value] of Object.entries(extraParams)) {
      if (value == null || requestUrl.searchParams.has(key)) {
        continue;
      }

      requestUrl.searchParams.set(key, String(value));
    }

    requestUrl.searchParams.set(callbackParam, callbackName);
    script.async = true;
    script.src = requestUrl.toString();
    script.onerror = () => {
      if (settled) {
        return;
      }

      window.clearTimeout(timeout);
      cleanup();
      reject(new Error("bilibili metadata request failed"));
    };

    document.body.appendChild(script);
  });
}

function loadJsonp(src) {
  return loadCallbackScript(src, {
    callbackParam: "callback",
    extraParams: {
      jsonp: "jsonp",
    },
  });
}

function fetchVideoInfo(parsed) {
  const cacheKey = parsed.bvid ? `bvid:${parsed.bvid}` : `aid:${parsed.aid}`;

  if (!videoInfoCache.has(cacheKey)) {
    const params = new URLSearchParams();

    if (parsed.bvid) {
      params.set("bvid", parsed.bvid);
    } else {
      params.set("aid", parsed.aid);
    }

    videoInfoCache.set(
      cacheKey,
      loadJsonp(`https://api.bilibili.com/x/web-interface/view?${params.toString()}`).then((payload) => {
        if (!payload || payload.code !== 0 || !payload.data) {
          throw new Error("bilibili metadata payload was invalid");
        }

        return payload.data;
      })
    );
  }

  return videoInfoCache.get(cacheKey);
}

function fetchQQMusicSongInfo(parsed) {
  if (parsed.kind !== "qqmusic" || parsed.mediaType !== "song") {
    return Promise.reject(new Error("QQ Music metadata is only supported for songs"));
  }

  const cacheKey = `${parsed.idType}:${parsed.itemId}`;

  if (!qqMusicSongInfoCache.has(cacheKey)) {
    const params = new URLSearchParams({
      tpl: "yqq_song_detail",
      format: "jsonp",
    });

    if (parsed.idType === "id") {
      params.set("songid", parsed.itemId);
    } else {
      params.set("songmid", parsed.itemId);
    }

    qqMusicSongInfoCache.set(
      cacheKey,
      loadCallbackScript(`https://i.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?${params.toString()}`).then(
        (payload) => {
          const song = Array.isArray(payload?.data) ? payload.data[0] : null;

          if (!song || payload?.code !== 0) {
            throw new Error("QQ Music metadata payload was invalid");
          }

          return song;
        }
      )
    );
  }

  return qqMusicSongInfoCache.get(cacheKey);
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (typeof text === "string") {
    element.textContent = text;
  }

  return element;
}

function normalizeMediaUrl(url) {
  if (!url) {
    return "";
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`;
  }

  return url;
}

function getPlaceholderLabel(parsedOrProvider) {
  const parsed = typeof parsedOrProvider === "string" ? null : parsedOrProvider;
  const provider = typeof parsedOrProvider === "string" ? parsedOrProvider : parsed?.provider || "bilibili";

  if (provider === "xiaohongshu") {
    return parsed?.brand === "rednote" ? "RedNote" : "小红书";
  }

  if (provider === "zhihu") {
    return "Zhihu";
  }

  if (provider === "wechat") {
    return "微信公号";
  }

  if (provider === "marxists") {
    return "马克思主义文库";
  }

  if (provider === "qqmusic") {
    return "QQ Music";
  }

  return provider === "netease" ? "NetEase Cloud Music" : "bilibili";
}

function ensurePosterPlaceholder(media) {
  if (!media || media.querySelector(".bilibili-inline-player__placeholder")) {
    return;
  }

  media.prepend(
    createElement("div", "bilibili-inline-player__placeholder", media.dataset.placeholderLabel || "bilibili")
  );
}

function configurePosterElement(poster, title, fallbackUrl = "") {
  poster.alt = title || "bilibili";
  poster.loading = "lazy";
  poster.referrerPolicy = "no-referrer";
  poster.dataset.bilibiliFallbackPoster = fallbackUrl || "";
  poster.onerror = () => {
    const nextFallback = poster.dataset.bilibiliFallbackPoster;

    if (nextFallback && poster.src !== nextFallback) {
      poster.dataset.bilibiliFallbackPoster = "";
      poster.src = nextFallback;
      return;
    }

    const media = poster.parentElement;
    poster.remove();
    ensurePosterPlaceholder(media);
  };
}

function extractPoster(target) {
  const image = target.querySelector("img");
  return normalizeMediaUrl(image?.src || "");
}

function normalizeTitleText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function cleanProviderTitle(title, parsed) {
  let cleaned = normalizeTitleText(title);

  if (!cleaned) {
    return "";
  }

  /* Discourse appends click telemetry to link aria-labels. It is not content
     metadata and must never become a card title or accessible region label. */
  cleaned = cleaned.replace(/\s+link clicked \d+ times?$/i, "");

  if (parsed?.provider === "netease") {
    cleaned = cleaned.replace(/\s*-\s*网易云音乐\s*$/i, "");
    cleaned = cleaned.replace(/\s*-\s*(?:单曲|专辑|歌单|播客节目|播客|电台)\s*$/i, "");
  }

  if (parsed?.provider === "qqmusic") {
    cleaned = cleaned.replace(/\s*-\s*qq音乐.*$/i, "");
    cleaned = cleaned.replace(/\s*-\s*qq\s*music.*$/i, "");
  }

  if (parsed?.provider === "zhihu") {
    cleaned = cleaned.replace(/\s*(?:[-|/]\s*)?(?:知乎|zhihu)\s*$/iu, "");
    cleaned = cleaned.replace(/\s*-\s*知乎专栏\s*$/iu, "");
  }

  if (parsed?.provider === "wechat") {
    cleaned = cleaned.replace(/\s*(?:[-|/]\s*)?(?:微信公众平台|微信公号|微信公众号)\s*$/iu, "");
  }

  if (parsed?.provider === "bdfz-post") {
    cleaned = cleaned.replace(/\s*(?:[-|/]\s*)?suen\s*$/iu, "");
  }

  if (parsed?.provider === "marxists") {
    cleaned = cleaned.replace(
      /\s*[-|–—]\s*(?:marxists internet archive|marxists\.org|中文马克思主义文库|马克思主义文库)\s*$/iu,
      ""
    );
  }

  return normalizeTitleText(cleaned);
}

const GENERIC_TITLE_RE =
  /^(?:bilibili|哔哩哔哩|b站|网易云音乐|netease\s*(?:cloud\s*)?music|music\.163\.com|(?:www\.)?bilibili\.com|qq音乐|qqmusic|qq\s*music|(?:i\.)?y\.qq\.com|知乎|zhihu|(?:www\.)?zhihu\.com|zhuanlan\.zhihu\.com|bdfz\s*博文|(?:www\.)?bdfz\.net|marxists\s*internet\s*archive|马克思主义文库|中文马克思主义文库|(?:https?:\/\/)?(?:music\.163\.com|(?:www\.)?bilibili\.com|(?:i\.)?y\.qq\.com|(?:www\.)?zhihu\.com|zhuanlan\.zhihu\.com|(?:www\.)?bdfz\.net|(?:www\.)?marxists\.org)(?:\/\S*)?)$/i;

function extractStructuredProviderTitle(candidate, parsed) {
  const text = normalizeTitleText(candidate);

  if (!text) {
    return "";
  }

  if (parsed?.provider === "netease") {
    const songBySingerMatch = text.match(/歌曲名[《"]([^》"]+)[》"]\s*，\s*由\s*([^，。]+?)\s*演唱/u);

    if (songBySingerMatch) {
      return buildSongDisplayTitle(songBySingerMatch[1], [songBySingerMatch[2]]);
    }

    const titleOnlyMatch = text.match(/[《"]([^》"]+)[》"](?:下载|歌词|在线试听|无损音乐下载)/u);

    if (titleOnlyMatch) {
      return normalizeTitleText(titleOnlyMatch[1]);
    }
  }

  return "";
}

function isGenericTitle(title) {
  if (!title || title.length < 2) {
    return true;
  }

  return (
    GENERIC_TITLE_RE.test(title) ||
    /^网易云音乐(?:是一款|是一个|专注于|，)/u.test(title) ||
    /^qq音乐(?:是|，)/iu.test(title)
  );
}

function isPlaceholderTitle(title, parsed) {
  return normalizeTitleText(title) === normalizeTitleText(getFallbackTitle(parsed));
}

function collectTextTitleCandidates(target, fallbackAnchor) {
  const candidates = [];
  const pushCandidate = (value) => {
    if (value) {
      candidates.push(value);
    }
  };

  for (const element of target.querySelectorAll(".onebox-body h3 a, .onebox-body h3, h3 a, h3")) {
    pushCandidate(element.textContent);
    pushCandidate(element.getAttribute?.("title"));
    pushCandidate(element.getAttribute?.("aria-label"));
  }

  for (const element of target.querySelectorAll("[data-title], [title], [aria-label], img[alt]")) {
    pushCandidate(element.getAttribute?.("data-title"));
    pushCandidate(element.getAttribute?.("title"));
    pushCandidate(element.getAttribute?.("aria-label"));
    pushCandidate(element.getAttribute?.("alt"));
  }

  for (const line of (target.textContent || "").split(/\n+/)) {
    pushCandidate(line);
  }

  pushCandidate(fallbackAnchor?.textContent);
  pushCandidate(fallbackAnchor?.getAttribute?.("title"));
  pushCandidate(fallbackAnchor?.getAttribute?.("aria-label"));

  return candidates;
}

function extractTitle(target, fallbackAnchor, parsed) {
  for (const candidate of collectTextTitleCandidates(target, fallbackAnchor)) {
    const structuredTitle = extractStructuredProviderTitle(candidate, parsed);

    if (structuredTitle && !isGenericTitle(structuredTitle)) {
      return structuredTitle;
    }

    const title = cleanProviderTitle(candidate, parsed);

    if (!title || title.length > 120) {
      continue;
    }

    if (
      isGenericTitle(title) ||
      title === getMetaLine(parsed) ||
      title === getOpenLabel(parsed) ||
      title === getFooterMeta(parsed)
    ) {
      continue;
    }

    return title;
  }

  return getFallbackTitle(parsed);
}

function getElementTextLines(element) {
  if (!element?.cloneNode) {
    return [];
  }

  const clone = element.cloneNode(true);

  for (const lineBreak of clone.querySelectorAll("br")) {
    lineBreak.replaceWith("\n");
  }

  return (clone.textContent || "")
    .split(/\n+/u)
    .map(normalizeTitleText)
    .filter(Boolean);
}

function buildXiaohongshuPreviewText(lines) {
  const contentLines = lines
    .map(normalizeTitleText)
    .filter(Boolean)
    .map((line) =>
      normalizeTitleText(
        line
          .replace(XIAOHONGSHU_INLINE_URL_RE, " ")
          .replace(XIAOHONGSHU_INLINE_CTA_RE, " ")
      )
    )
    .filter(Boolean);

  if (contentLines.length === 0) {
    return { title: "", description: "" };
  }

  const lead = contentLines.length > 1 ? contentLines[0] : "";
  const primary = contentLines.length > 1 ? contentLines.slice(1).join(" ") : contentLines[0];
  const sentenceMatch = primary.match(/^(.{2,48}?[。！？!?])\s*(.*)$/u);

  if (sentenceMatch) {
    const description = [sentenceMatch[2], lead].map(normalizeTitleText).filter(Boolean).join(" · ");
    return {
      title: normalizeTitleText(sentenceMatch[1]).slice(0, 120),
      description: description.slice(0, 360),
    };
  }

  return {
    title: contentLines[0].slice(0, 120),
    description: contentLines.slice(1).join(" ").slice(0, 360),
  };
}

function isXiaohongshuShareTextElement(element) {
  const childElements = Array.from(element?.children || []);

  return Boolean(
    element &&
      ["P", "PRE"].includes(element.tagName) &&
      normalizeTitleText(element.textContent || "").length <= 800 &&
      childElements.every((child) => child.tagName === "BR") &&
      extractUrlsFromText(element.textContent || "").length === 0 &&
      !element.querySelector("a[href], iframe[src], aside.onebox, article.onebox, .bilibili-inline-player")
  );
}

function extractXiaohongshuShareContext(target) {
  const previous = target?.previousElementSibling;
  const next = target?.nextElementSibling;
  const nextText = normalizeTitleText(next?.textContent || "");

  if (
    isXiaohongshuShareTextElement(previous) &&
    isXiaohongshuShareTextElement(next) &&
    XIAOHONGSHU_SHARE_CTA_RE.test(nextText)
  ) {
    const preview = buildXiaohongshuPreviewText(getElementTextLines(previous));

    if (preview.title) {
      return {
        ...preview,
      };
    }
  }

  if (target?.matches?.("p, pre")) {
    return {
      ...buildXiaohongshuPreviewText(getElementTextLines(target)),
    };
  }

  return { title: "", description: "" };
}

function extractXiaohongshuCookedMetadata(target, fallbackAnchor, parsed) {
  const title = extractTitle(target, fallbackAnchor, parsed);
  const usableTitle =
    title && !isPlaceholderTitle(title, parsed) && !XIAOHONGSHU_UNUSABLE_TITLE_RE.test(title);
  const description = normalizeTitleText(
    target.querySelector(".onebox-body p, .onebox-body .onebox-description")?.textContent || ""
  );

  return {
    title: usableTitle ? title : "",
    description:
      usableTitle && !XIAOHONGSHU_UNUSABLE_TITLE_RE.test(description) ? description.slice(0, 360) : "",
    poster: usableTitle ? extractPoster(target) : "",
  };
}

function extractMarxistsCookedText(target) {
  const description = normalizeTitleText(
    target.querySelector(".onebox-body p, .onebox-body .onebox-description")?.textContent || ""
  );

  return isGenericTitle(description) ? "" : description.slice(0, 400);
}

function buildMetadata(target, fallbackAnchor, parsed) {
  if (parsed.provider === "ebook") {
    const anchorTitle = normalizeTitleText(fallbackAnchor?.textContent || "");

    return {
      parsed,
      title: anchorTitle || parsed.filename || getFallbackTitle(parsed),
      description: `${parsed.format.toUpperCase()} 格式将在此浏览器中本地解析。`,
      poster: "",
      canonicalUrl: parsed.canonicalUrl,
      metaLine: getMetaLine(parsed),
      viewCount: null,
      environmentRisk: { level: "none", message: "" },
    };
  }

  if (parsed.provider === "marxists") {
    return {
      parsed,
      title: extractTitle(target, fallbackAnchor, parsed),
      description: getMarxistsDescription(parsed),
      sourceText: extractMarxistsCookedText(target),
      poster: extractPoster(target),
      canonicalUrl: parsed.canonicalUrl,
      metaLine: getMetaLine(parsed),
      viewCount: null,
      environmentRisk: { level: "none", message: "" },
    };
  }

  if (parsed.provider === "xiaohongshu") {
    const context = extractXiaohongshuShareContext(target);
    const cooked = extractXiaohongshuCookedMetadata(target, fallbackAnchor, parsed);

    return {
      parsed,
      title: context.title || cooked.title || getFallbackTitle(parsed),
      description: context.description || cooked.description,
      poster: cooked.poster,
      canonicalUrl: parsed.canonicalUrl,
      metaLine: getMetaLine(parsed),
      viewCount: null,
      environmentRisk: detectEmbedEnvironmentRisk(parsed.provider),
    };
  }

  return {
    parsed,
    title: extractTitle(target, fallbackAnchor, parsed),
    description: "",
    poster: extractPoster(target),
    canonicalUrl: parsed.canonicalUrl,
    metaLine: getMetaLine(parsed),
    viewCount: null,
    environmentRisk: detectEmbedEnvironmentRisk(parsed.provider),
  };
}

function resolvePosterFromData(data, page) {
  const pages = Array.isArray(data?.pages) ? data.pages : [];
  const pageData = pages.find((entry) => entry.page === page) || null;
  return {
    posterUrl: normalizeMediaUrl(data?.pic || pageData?.first_frame || ""),
    fallbackPosterUrl: normalizeMediaUrl(pageData?.first_frame || ""),
  };
}

function updateWrapperMetadata(wrapper, data) {
  if (!data) {
    return;
  }

  const state = wrapperState.get(wrapper);
  if (!state?.parsed) {
    return;
  }

  const resolvedAid = data.aid || state.parsed.aid;
  const canonicalId =
    data.bvid || state.parsed.bvid || (resolvedAid ? `av${resolvedAid}` : state.parsed.rawId);
  const canonicalUrl = buildVideoCanonicalUrl(canonicalId, state.parsed.page);
  const title = data.title?.trim();
  const viewCount = data.stat?.view;
  const { posterUrl, fallbackPosterUrl } = resolvePosterFromData(data, state.parsed.page);
  const titleElement = wrapper.querySelector(".bilibili-inline-player__title");
  const statElement = wrapper.querySelector(".bilibili-inline-player__subline");
  const openLink = wrapper.querySelector(".bilibili-inline-player__footer-link");
  const media = wrapper.querySelector(".bilibili-inline-player__media");
  const existingPoster = wrapper.querySelector(".bilibili-inline-player__poster");
  const placeholder = wrapper.querySelector(".bilibili-inline-player__placeholder");

  state.parsed.canonicalUrl = canonicalUrl;
  wrapper.dataset.bilibiliUrl = canonicalUrl;

  if (openLink) {
    openLink.href = canonicalUrl;
  }

  if (title) {
    wrapper.dataset.bilibiliTitle = title;

    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  if (Number.isFinite(Number(viewCount))) {
    wrapper.dataset.bilibiliViewCount = String(viewCount);
    wrapper.dataset.bilibiliFooterMeta = getPreviewStatText(state.parsed, viewCount);

    if (statElement) {
      statElement.textContent = getPreviewStatText(state.parsed, viewCount);
    }
  }

  if (posterUrl && media) {
    if (existingPoster) {
      existingPoster.src = posterUrl;
      configurePosterElement(existingPoster, wrapper.dataset.bilibiliTitle || title || "bilibili", fallbackPosterUrl);
    } else {
      const poster = createElement("img", "bilibili-inline-player__poster");
      poster.src = posterUrl;
      configurePosterElement(poster, wrapper.dataset.bilibiliTitle || title || "bilibili", fallbackPosterUrl);
      placeholder?.remove();
      media.prepend(poster);
    }
  }
}

function formatMusicArtists(artists) {
  return artists
    .map((artist) => normalizeTitleText(artist))
    .filter(Boolean)
    .join(" / ");
}

function buildSongDisplayTitle(name, artists = []) {
  const baseName = normalizeTitleText(name);
  const artistLine = formatMusicArtists(artists);

  if (!baseName) {
    return "";
  }

  return artistLine ? `${baseName} - ${artistLine}` : baseName;
}

function updatePreviewTitle(wrapper, title) {
  const nextTitle = normalizeTitleText(title);

  if (!nextTitle) {
    return;
  }

  const state = wrapperState.get(wrapper);
  const titleElement =
    wrapper.querySelector(".bilibili-inline-player__compact-title") ||
    wrapper.querySelector(".bilibili-inline-player__title");
  const playButton = wrapper.querySelector(".bilibili-inline-player__play");
  const playLabel = wrapper.querySelector(".bilibili-inline-player__play-label");
  const iframe = wrapper.querySelector(".bilibili-inline-player__frame");

  wrapper.dataset.bilibiliTitle = nextTitle;

  if (state) {
    state.title = nextTitle;
  }

  if (titleElement) {
    titleElement.textContent = nextTitle;
  }

  if (playButton) {
    const buttonText = playLabel?.textContent?.trim() || getInitialButtonLabel(state?.parsed || {});
    playButton.setAttribute("aria-label", `${buttonText}: ${nextTitle}`);
  }

  if (iframe) {
    iframe.title = nextTitle;
  }
}

function updatePreviewCanonicalUrl(wrapper, canonicalUrl) {
  const nextUrl = normalizeUrlLikeString(canonicalUrl);

  if (!nextUrl) {
    return;
  }

  const state = wrapperState.get(wrapper);

  wrapper.dataset.bilibiliUrl = nextUrl;

  if (state?.parsed) {
    state.parsed.canonicalUrl = nextUrl;
  }

  for (const link of wrapper.querySelectorAll(".bilibili-inline-player__footer-link")) {
    link.href = nextUrl;
  }
}

function updateQQMusicPreviewMetadata(wrapper, song) {
  const title = buildSongDisplayTitle(song?.name || song?.title, (song?.singer || []).map((entry) => entry?.name));

  if (!title) {
    return;
  }

  updatePreviewTitle(wrapper, title);

  const canonicalMid = normalizeTitleText(song?.mid);

  if (canonicalMid) {
    updatePreviewCanonicalUrl(wrapper, buildQQMusicCanonicalUrl("song", canonicalMid));
  }
}

function getPreviewAspectRatio(parsed) {
  switch (parsed.kind) {
    case "video":
    case "bangumi":
    case "live":
      return "16 / 9";
    case "douyin":
      return DOUYIN_PLAYER_ASPECT_RATIO;
    case "netease":
      return isCompactNetEase(parsed) ? "auto" : "4 / 3";
    case "qqmusic":
      return isCompactQQMusic(parsed) ? "auto" : "4 / 3";
    case "marxists":
      return parsed.contentType === "video" ? "16 / 9" : "auto";
    case "zhihu":
    case "bdfz-post":
    case "xiaohongshu":
    case "ebook":
      return "auto";
    default:
      return "4 / 3";
  }
}

function getLoadedFrameHeight(parsed) {
  if (parsed.kind === "bdfz-post") {
    return getBoundedIntegerSetting("bdfz_post_embed_height", 900, 480, 1600);
  }

  if (parsed.kind === "xiaohongshu") {
    return 720;
  }

  if (parsed.kind === "qqmusic") {
    return getQQMusicEmbedHeight(parsed);
  }

  return parsed.kind === "netease" ? getNetEaseEmbedHeight(parsed) : 0;
}

function buildWrapper(metadata) {
  const wrapper = createElement("div", "bilibili-inline-player");
  const compact = isCompactAudio(metadata.parsed);

  wrapper.dataset.bilibiliUrl = metadata.canonicalUrl;
  wrapper.dataset.bilibiliMeta = metadata.metaLine;
  wrapper.dataset.bilibiliFooterMeta = getFooterMeta(metadata.parsed);
  wrapper.dataset.bilibiliTitle = metadata.title;
  wrapper.dataset.bilibiliViewCount = "";
  wrapper.dataset.bilibiliKind = metadata.parsed.kind;
  wrapper.dataset.bilibiliProvider = metadata.parsed.provider || "bilibili";
  wrapper.dataset.bilibiliRiskLevel = metadata.environmentRisk?.level || "none";
  wrapper.style.setProperty("--bili-aspect-ratio", getPreviewAspectRatio(metadata.parsed));
  wrapper.classList.add(`bilibili-inline-player--${metadata.parsed.provider || "bilibili"}`);
  wrapperState.set(wrapper, metadata);

  if (isReaderCard(metadata.parsed)) {
    wrapper.classList.add("bilibili-inline-player--reading");
    buildReadingCard(wrapper, metadata);
  } else if (compact) {
    wrapper.classList.add("bilibili-inline-player--compact-audio");
    buildCompactAudioCard(wrapper, metadata);
  } else {
    buildStandardCard(wrapper, metadata);
  }

  if (
    metadata.environmentRisk?.level === "hard" &&
    isKnownInlineKind(metadata.parsed) &&
    getBooleanSetting("auto_open_on_high_risk_env", true)
  ) {
    setButtonLabel(wrapper, getOpenLabel(metadata.parsed));
  }

  primeEmbedState(wrapper);

  if (shouldAutoExpandEmbed(metadata.parsed)) {
    Promise.resolve().then(() => autoExpandWrapper(wrapper));
  }

  return wrapper;
}

function buildReadingCard(wrapper, metadata) {
  const body = createElement("div", "bilibili-inline-player__reading-body");
  const badge = createElement("span", "bilibili-inline-player__reading-badge", metadata.metaLine);
  const title = createElement("h3", "bilibili-inline-player__reading-title", metadata.title);

  body.append(badge, title);

  if (metadata.description) {
    body.appendChild(
      createElement("div", "bilibili-inline-player__reading-byline", metadata.description)
    );
  }

  if (metadata.sourceText) {
    body.appendChild(
      createElement("p", "bilibili-inline-player__reading-text", metadata.sourceText)
    );
  }

  if (supportsExpandReader(metadata.parsed) || supportsWeChatArchive(metadata.parsed)) {
    const status = createElement(
      "div",
      "bilibili-inline-player__reading-status",
      metadata.parsed.provider === "zhihu"
        ? "正在读取知乎摘要…"
        : metadata.parsed.provider === "wechat"
          ? "正在转换并展开微信全文…"
          : "正在展开原文…"
    );

    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    body.appendChild(status);
  }

  const footer = createElement("div", "bilibili-inline-player__footer");
  const footerContent = createElement("div", "bilibili-inline-player__footer-content");
  const footerActions = createElement("div", "bilibili-inline-player__footer-actions");
  const link = createElement(
    "a",
    "bilibili-inline-player__footer-link",
    getOpenLabel(metadata.parsed)
  );

  footerContent.appendChild(
    createElement("div", "bilibili-inline-player__footer-meta", getFooterMeta(metadata.parsed))
  );
  link.href = metadata.canonicalUrl;
  link.target = "_blank";
  link.rel = "noopener nofollow ugc";
  footerActions.appendChild(link);
  footer.append(footerContent, footerActions);

  wrapper.dataset.bilibiliLoaded = "1";
  wrapper.append(body, footer);

  if (supportsExpandReader(metadata.parsed)) {
    Promise.resolve().then(() => expandThroughReader(wrapper));
  } else if (supportsWeChatArchive(metadata.parsed)) {
    Promise.resolve().then(() => expandWeChatArchive(wrapper));
  }
}

function buildCompactAudioCard(wrapper, metadata) {
  const body = createElement("div", "bilibili-inline-player__compact-body");
  const info = createElement("div", "bilibili-inline-player__compact-info");
  const musicIcon = createElement("span", "bilibili-inline-player__music-icon", "♪");
  const title = createElement("span", "bilibili-inline-player__compact-title", metadata.title);
  const badge = createElement("span", "bilibili-inline-player__compact-badge", metadata.metaLine);
  const actions = createElement("div", "bilibili-inline-player__compact-actions");
  const playButton = createElement("button", "bilibili-inline-player__play bilibili-inline-player__play--compact");
  const playIcon = createElement("span", "bilibili-inline-player__play-icon");
  const playLabel = createElement("span", "bilibili-inline-player__play-label", getInitialButtonLabel(metadata.parsed));

  playButton.type = "button";
  playButton.setAttribute("aria-label", `${getInitialButtonLabel(metadata.parsed)}: ${metadata.title}`);
  playButton.append(playIcon, playLabel);
  playButton.addEventListener("click", () => activatePlayer(wrapper));

  info.append(musicIcon, title, badge);
  actions.appendChild(playButton);

  if (getBooleanSetting("show_open_link", true)) {
    const link = createElement("a", "bilibili-inline-player__footer-link bilibili-inline-player__compact-link", getOpenLabel(metadata.parsed));
    link.href = metadata.canonicalUrl;
    link.target = "_blank";
    link.rel = "noopener nofollow ugc";
    actions.appendChild(link);
  }

  body.append(info, actions);
  wrapper.appendChild(body);
}

function buildStandardCard(wrapper, metadata) {
  const media = createElement("div", "bilibili-inline-player__media");
  const scrim = createElement("div", "bilibili-inline-player__scrim");
  const title = createElement("h3", "bilibili-inline-player__title", metadata.title);
  const subline = createElement(
    "div",
    "bilibili-inline-player__subline",
    getPreviewStatText(metadata.parsed, metadata.viewCount)
  );
  const playButton = createElement("button", "bilibili-inline-player__play");
  const playIcon = createElement("span", "bilibili-inline-player__play-icon");
  const playLabel = createElement(
    "span",
    "bilibili-inline-player__play-label",
    getInitialButtonLabel(metadata.parsed)
  );
  const footer = createElement("div", "bilibili-inline-player__footer");
  const footerContent = createElement("div", "bilibili-inline-player__footer-content");
  const footerActions = createElement("div", "bilibili-inline-player__footer-actions");

  media.dataset.placeholderLabel = getPlaceholderLabel(metadata.parsed);

  if (metadata.poster) {
    const poster = createElement("img", "bilibili-inline-player__poster");
    poster.src = metadata.poster;
    configurePosterElement(poster, metadata.title);
    media.appendChild(poster);
  } else {
    media.appendChild(
      createElement("div", "bilibili-inline-player__placeholder", getPlaceholderLabel(metadata.parsed))
    );
  }

  playButton.type = "button";
  playButton.setAttribute("aria-label", `${getInitialButtonLabel(metadata.parsed)}: ${metadata.title}`);
  playButton.append(playIcon, playLabel);

  media.append(scrim, playButton);
  playButton.addEventListener("click", () => activatePlayer(wrapper));

  footerContent.appendChild(title);
  if (metadata.description) {
    footerContent.appendChild(
      createElement("div", "bilibili-inline-player__description", metadata.description)
    );
  }

  footerContent.appendChild(subline);

  if (metadata.environmentRisk?.message && isKnownInlineKind(metadata.parsed)) {
    footerContent.appendChild(createElement("div", "bilibili-inline-player__notice", metadata.environmentRisk.message));
  }

  if (shouldShowDirectSourceLink(metadata.parsed)) {
    const link = createElement("a", "bilibili-inline-player__footer-link", getOpenLabel(metadata.parsed));
    link.href = metadata.canonicalUrl;
    link.target = "_blank";
    link.rel = "noopener nofollow ugc";
    footerActions.appendChild(link);
  }

  if (metadata.parsed.kind !== "video" && !isCompactAudio(metadata.parsed)) {
    const footerMeta = createElement("div", "bilibili-inline-player__footer-meta", getFooterMeta(metadata.parsed));
    footerContent.appendChild(footerMeta);
  }

  footer.appendChild(footerContent);
  if (footerActions.childElementCount > 0) {
    footer.appendChild(footerActions);
  }

  wrapper.append(media, footer);
}

function setButtonLabel(wrapper, text) {
  const buttonLabel = wrapper.querySelector(".bilibili-inline-player__play-label");

  if (buttonLabel) {
    buttonLabel.textContent = text;
  }
}

function primeEmbedState(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!state?.parsed || state.resolvePromise) {
    return;
  }

  const isHardRiskEmbedEnv =
    state.environmentRisk?.level === "hard" &&
    isKnownInlineKind(state.parsed) &&
    getBooleanSetting("auto_open_on_high_risk_env", true);

  if (isHardRiskEmbedEnv) {
    state.iframeUrl = null;
    state.externalOnly = true;
    setButtonLabel(wrapper, getOpenLabel(state.parsed));
    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind === "bangumi") {
    state.iframeUrl = buildIframeUrl(state.parsed);
    state.standardIframeUrl = state.iframeUrl;
    state.noAutoplayIframeUrl = buildNoAutoplayIframeUrl(state.parsed);
    state.externalOnly = false;
    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind === "douyin") {
    state.iframeUrl = buildIframeUrl(state.parsed);
    state.standardIframeUrl = state.iframeUrl;
    state.noAutoplayIframeUrl = buildNoAutoplayIframeUrl(state.parsed);
    state.externalOnly = false;
    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind === "live") {
    if (getBooleanSetting("enable_experimental_live_embed", true)) {
      state.iframeUrl = buildIframeUrl(state.parsed);
      state.standardIframeUrl = state.iframeUrl;
      state.noAutoplayIframeUrl = "";
      state.externalOnly = false;
    } else {
      state.iframeUrl = null;
      state.externalOnly = true;
      setButtonLabel(wrapper, getOpenLabel(state.parsed));
    }

    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind === "netease") {
    state.iframeUrl = buildIframeUrl(state.parsed);
    state.standardIframeUrl = state.iframeUrl;
    state.noAutoplayIframeUrl = buildNoAutoplayIframeUrl(state.parsed);
    state.externalOnly = false;
    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind === "qqmusic") {
    if (state.parsed.mediaType === "song") {
      state.iframeUrl = buildIframeUrl(state.parsed);
      state.standardIframeUrl = state.iframeUrl;
      state.noAutoplayIframeUrl = buildNoAutoplayIframeUrl(state.parsed);
      state.externalOnly = false;
    } else {
      state.iframeUrl = null;
      state.externalOnly = true;
      setButtonLabel(wrapper, getOpenLabel(state.parsed));
    }

    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind === "bdfz-post") {
    if (getBooleanSetting("enable_bdfz_posts_inline", true)) {
      state.iframeUrl = state.parsed.canonicalUrl;
      state.standardIframeUrl = state.iframeUrl;
      state.noAutoplayIframeUrl = "";
      state.externalOnly = false;
    } else {
      state.iframeUrl = null;
      state.externalOnly = true;
      setButtonLabel(wrapper, getOpenLabel(state.parsed));
    }

    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind === "xiaohongshu") {
    if (getBooleanSetting("enable_xiaohongshu_inline_page", true)) {
      state.iframeUrl = state.parsed.canonicalUrl;
      state.standardIframeUrl = state.iframeUrl;
      state.noAutoplayIframeUrl = "";
      state.externalOnly = false;
    } else {
      state.iframeUrl = null;
      state.externalOnly = true;
      setButtonLabel(wrapper, getOpenLabel(state.parsed));
    }

    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind === "marxists") {
    state.iframeUrl = null;
    state.standardIframeUrl = "";
    state.noAutoplayIframeUrl = "";
    state.externalOnly = !isMarxistsInlineMedia(state.parsed);
    state.resolvePromise = Promise.resolve(state.parsed);

    if (state.externalOnly) {
      setButtonLabel(wrapper, getOpenLabel(state.parsed));
    }

    return;
  }

  if (state.parsed.kind === "ebook") {
    state.iframeUrl = null;
    state.externalOnly = !getBooleanSetting("enable_ebook_reader", true);
    state.resolvePromise = Promise.resolve(state.parsed);

    if (state.externalOnly) {
      setButtonLabel(wrapper, getOpenLabel(state.parsed));
    }

    return;
  }

  if (state.parsed.kind !== "video") {
    state.iframeUrl = null;
    state.externalOnly = true;
    setButtonLabel(wrapper, getOpenLabel(state.parsed));
    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  const directEmbedReady = Boolean(state.parsed.cid && (state.parsed.bvid || state.parsed.aid));

  state.resolvePromise = fetchVideoInfo(state.parsed)
    .then((data) => {
      updateWrapperMetadata(wrapper, data);
      const pages = Array.isArray(data.pages) ? data.pages : [];
      const pageData = pages.find((page) => page.page === state.parsed.page) || null;
      const resolved = {
        page: state.parsed.page,
        bvid: data.bvid || state.parsed.bvid,
        aid: data.aid || state.parsed.aid,
        cid: pageData?.cid || state.parsed.cid || (state.parsed.page === 1 ? data.cid : null),
      };

      if (!resolved?.cid) {
        throw new Error("bilibili cid was unavailable");
      }

      state.iframeUrl = buildIframeUrl(resolved);
      state.standardIframeUrl = state.iframeUrl;
      state.noAutoplayIframeUrl = buildNoAutoplayIframeUrl(resolved);
      state.externalOnly = false;
      return resolved;
    })
    .catch(() => {
      if (directEmbedReady) {
        state.iframeUrl = buildIframeUrl(state.parsed);
        state.standardIframeUrl = state.iframeUrl;
        state.noAutoplayIframeUrl = buildNoAutoplayIframeUrl(state.parsed);
        state.externalOnly = false;
        return state.parsed;
      }

      state.iframeUrl = null;
      state.externalOnly = true;
      setButtonLabel(wrapper, getOpenLabel(state.parsed));
      return null;
    });
}

async function autoExpandWrapper(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!state?.parsed || wrapper.dataset.bilibiliLoaded === "1") {
    return;
  }

  if (state.parsed.kind === "ebook") {
    await activateEbookReader(wrapper);
    return;
  }

  if (isMarxistsInlineMedia(state.parsed)) {
    renderMarxistsMediaPlayer(wrapper);
    return;
  }

  if (state.resolvePromise) {
    await state.resolvePromise;
  }

  if (state.externalOnly) {
    return;
  }

  const nonAutoplayUrl = state.noAutoplayIframeUrl || state.iframeUrl;

  if (nonAutoplayUrl) {
    renderLoadedPlayer(wrapper, nonAutoplayUrl);
  }
}

function supportsNoAutoplayRetry(state) {
  return Boolean(
    state?.noAutoplayIframeUrl &&
      state.noAutoplayIframeUrl !== state.standardIframeUrl &&
      state.parsed?.provider === "bilibili" &&
      (state.parsed.kind === "video" || state.parsed.kind === "bangumi")
  );
}

function updateRetryButtonLabel(wrapper) {
  const button = wrapper.querySelector(".bilibili-inline-player__retry-button");
  const state = wrapperState.get(wrapper);

  if (!button || !state) {
    return;
  }

  button.textContent = state.autoplayDisabled ? "已关闭自动播放" : "关闭自动播放重试";
  button.disabled = Boolean(state.autoplayDisabled);
}

function updateFooterMeta(wrapper) {
  const footerMeta = wrapper.querySelector(".bilibili-inline-player__footer-meta");
  const state = wrapperState.get(wrapper);

  if (!footerMeta || !state?.parsed) {
    return;
  }

  footerMeta.textContent =
    state.autoplayDisabled && supportsNoAutoplayRetry(state)
      ? `${wrapper.dataset.bilibiliFooterMeta || wrapper.dataset.bilibiliMeta} · 已关闭自动播放`
      : wrapper.dataset.bilibiliFooterMeta || wrapper.dataset.bilibiliMeta;
}

function swapIframeSource(wrapper, nextUrl) {
  const iframe = wrapper.querySelector(".bilibili-inline-player__frame");

  if (!iframe || !nextUrl) {
    return;
  }

  iframe.src = nextUrl;
}

function retryWithoutAutoplay(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!supportsNoAutoplayRetry(state) || state.autoplayDisabled) {
    return;
  }

  state.autoplayDisabled = true;
  swapIframeSource(wrapper, state.noAutoplayIframeUrl);
  updateRetryButtonLabel(wrapper);
  updateFooterMeta(wrapper);
}

function maybeAttachStuckHelpNotice(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!supportsNoAutoplayRetry(state)) {
    return;
  }

  window.setTimeout(() => {
    if (!wrapper.isConnected || wrapper.dataset.bilibiliLoaded !== "1") {
      return;
    }

    const footerContent = wrapper.querySelector(".bilibili-inline-player__footer-content");

    if (!footerContent || footerContent.querySelector(".bilibili-inline-player__notice--stuck")) {
      return;
    }

    footerContent.appendChild(
      createElement(
        "div",
        "bilibili-inline-player__notice bilibili-inline-player__notice--stuck",
        "若卡在“你感兴趣的视频都在B站”，请先点“关闭自动播放重试”，仍不行再点下方打开原站。"
      )
    );
  }, BILIBILI_STUCK_HELP_DELAY_MS);
}

function buildLoadedFooter(wrapper) {
  const state = wrapperState.get(wrapper);
  const footer = createElement("div", "bilibili-inline-player__footer");
  const footerContent = createElement("div", "bilibili-inline-player__footer-content");
  const footerActions = createElement("div", "bilibili-inline-player__footer-actions");

  if (!isCompactAudio(state.parsed)) {
    const footerMeta = createElement(
      "div",
      "bilibili-inline-player__footer-meta",
      wrapper.dataset.bilibiliFooterMeta || wrapper.dataset.bilibiliMeta
    );
    footerContent.appendChild(footerMeta);
  }

  if (supportsNoAutoplayRetry(state)) {
    const retryButton = createElement(
      "button",
      "bilibili-inline-player__footer-button bilibili-inline-player__retry-button",
      state.autoplayDisabled ? "已关闭自动播放" : "关闭自动播放重试"
    );
    retryButton.type = "button";
    retryButton.disabled = Boolean(state.autoplayDisabled);
    retryButton.addEventListener("click", () => retryWithoutAutoplay(wrapper));
    footerActions.appendChild(retryButton);
  }

  if (shouldShowDirectSourceLink(state.parsed)) {
    const link = createElement(
      "a",
      "bilibili-inline-player__footer-link",
      getLoadedOpenLabel(state.parsed)
    );
    link.href = wrapper.dataset.bilibiliUrl;
    link.target = "_blank";
    link.rel = "noopener nofollow ugc";
    footerActions.appendChild(link);
  }

  footer.appendChild(footerContent);
  if (footerActions.childElementCount > 0) {
    footer.appendChild(footerActions);
  }

  return footer;
}

/* Shared expand-reader service.

   Some sources refuse to be framed and refuse cross-origin reads, so a page the
   forum links to cannot be shown by the browser alone. For those, the component
   asks the BDFZ `expand-reader` Worker for an already-sanitized reading fragment
   and renders it in place, expanded, with no click step. Reader output is still
   treated as untrusted: it is re-sanitized here against the same allowlist
   before it touches the DOM, and any failure falls back to the source card. */
const READER_KEEP_TAGS = new Set([
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup",
  "blockquote", "q", "cite", "code", "pre", "kbd", "samp", "var",
  "ul", "ol", "li", "dl", "dt", "dd",
  "a", "img", "figure", "figcaption", "abbr", "time",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
  "ruby", "rt", "rp",
]);
const READER_DROP_TAGS = new Set([
  "script", "style", "noscript", "iframe", "object", "embed", "applet",
  "frame", "frameset", "form", "input", "button", "select", "option",
  "textarea", "svg", "math", "canvas", "audio", "video", "source", "track",
  "map", "area", "link", "base", "template", "dialog", "meta", "title", "nav",
]);
const READER_ALLOWED_ATTRIBUTES = {
  a: ["href", "title", "id", "name"],
  img: ["src", "alt", "title", "width", "height"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  time: ["datetime"],
  ol: ["start", "reversed"],
  blockquote: ["cite"],
  q: ["cite"],
};
const READER_TIMEOUT_MS = 15000;
const READER_CACHE_MAX_ENTRIES = 24;
const READER_CACHE_TTL_MS = 5 * 60 * 1000;
const WECHAT_ARCHIVE_REQUEST_TIMEOUT_MS = 90000;
const WECHAT_ARCHIVE_MAX_WAIT_MS = 4 * 60 * 1000;
const WECHAT_ARCHIVE_MAX_ATTEMPTS = 64;
const WECHAT_ARCHIVE_MAX_NETWORK_FAILURES = 2;
const WECHAT_ARCHIVE_RETRY_DELAY_MS = 2000;
const WECHAT_ARCHIVE_CACHE_MAX_ENTRIES = 24;
const WECHAT_ARCHIVE_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_WECHAT_INGEST_ENDPOINT = "https://wx.bdfz.net/api/ingest";
const DEFAULT_READER_ENDPOINT = "https://reader.bdfz.net/read";
const DEFAULT_READER_PANE_HEIGHT = 560;
const readerViewCache = new Map();
const wechatArchiveCache = new Map();
let readerFragmentSequence = 0;
let bdfzPostFrameSequence = 0;

function getWeChatIngestEndpoint() {
  const endpoint = getStringSetting(
    "wechat_ingest_endpoint",
    DEFAULT_WECHAT_INGEST_ENDPOINT
  ).trim();

  try {
    const url = new URL(endpoint);

    if (
      url.protocol !== "https:" ||
      url.hostname !== "wx.bdfz.net" ||
      url.port ||
      url.username ||
      url.password ||
      url.pathname !== "/api/ingest" ||
      url.search ||
      url.hash
    ) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function supportsWeChatArchive(parsed) {
  return Boolean(
    parsed?.provider === "wechat" &&
      parsed.kind === "wechat" &&
      getBooleanSetting("enable_wechat_inline", true) &&
      getWeChatIngestEndpoint()
  );
}

function getWeChatArchiveCacheKey(canonicalUrl, endpoint = getWeChatIngestEndpoint()) {
  return `${endpoint}\n${canonicalUrl}`;
}

function getCachedWeChatArchive(cacheKey, now = Date.now()) {
  const entry = wechatArchiveCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now) {
    wechatArchiveCache.delete(cacheKey);
    return null;
  }

  wechatArchiveCache.delete(cacheKey);
  wechatArchiveCache.set(cacheKey, entry);
  return entry.promise;
}

function storeWeChatArchive(cacheKey, promise, now = Date.now()) {
  for (const [key, entry] of wechatArchiveCache) {
    if (entry.expiresAt <= now) {
      wechatArchiveCache.delete(key);
    }
  }

  wechatArchiveCache.delete(cacheKey);
  const entry = {
    expiresAt: now + WECHAT_ARCHIVE_CACHE_TTL_MS,
    promise,
  };
  wechatArchiveCache.set(cacheKey, entry);

  while (wechatArchiveCache.size > WECHAT_ARCHIVE_CACHE_MAX_ENTRIES) {
    wechatArchiveCache.delete(wechatArchiveCache.keys().next().value);
  }

  return entry;
}

function normalizeWeChatArchivePayload(payload, parsed) {
  if (
    !payload?.ok ||
    !parsed?.canonicalUrl ||
    typeof payload.orig !== "string" ||
    !payload.orig.trim()
  ) {
    return null;
  }

  let archiveUrl;

  try {
    archiveUrl = new URL(String(payload.url || ""));
  } catch {
    return null;
  }

  const slug = archiveUrl.pathname.slice(1);
  let echoedSource;

  try {
    echoedSource = parseWeChatPageUrl(new URL(payload.orig));
  } catch {
    return null;
  }

  if (
    archiveUrl.protocol !== "https:" ||
    archiveUrl.hostname !== "wx.bdfz.net" ||
    archiveUrl.port ||
    archiveUrl.username ||
    archiveUrl.password ||
    archiveUrl.search ||
    archiveUrl.hash ||
    !/^[a-z0-9-]{6,128}$/i.test(slug) ||
    String(payload.slug || "") !== slug ||
    echoedSource?.sourceIdentity !== parsed.sourceIdentity
  ) {
    return null;
  }

  return {
    archiveUrl: archiveUrl.toString(),
    slug,
    title: normalizeTitleText(String(payload.title || "")).slice(0, 160),
  };
}

async function fetchWeChatArchive(parsed) {
  const endpoint = getWeChatIngestEndpoint();

  if (!endpoint || !supportsWeChatArchive(parsed)) {
    return null;
  }

  const cacheKey = getWeChatArchiveCacheKey(parsed.canonicalUrl, endpoint);
  const cached = getCachedWeChatArchive(cacheKey);

  if (cached) {
    return cached;
  }

  const request = fetchWeChatArchiveWithRetry(parsed, endpoint);

  const entry = storeWeChatArchive(cacheKey, request);
  const result = await request;

  if (!result && wechatArchiveCache.get(cacheKey) === entry) {
    wechatArchiveCache.delete(cacheKey);
  }

  return result;
}

function getWeChatRetryDelayMs(response, payload, fallbackMs = WECHAT_ARCHIVE_RETRY_DELAY_MS) {
  const retryAfterHeaderValue = response?.headers?.get?.("Retry-After");
  const retryAfterHeader = retryAfterHeaderValue === null || retryAfterHeaderValue === undefined || retryAfterHeaderValue === ""
    ? Number.NaN
    : Number(retryAfterHeaderValue);
  const retryAfterPayload = Number(payload?.retryAfter);
  const delayMs = Number.isFinite(retryAfterHeader)
    ? retryAfterHeader * 1000
    : Number.isFinite(retryAfterPayload)
      ? retryAfterPayload * 1000
      : fallbackMs;

  return Math.min(10000, Math.max(0, delayMs));
}

function waitForWeChatRetry(delayMs) {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

async function fetchWeChatArchiveWithRetry(parsed, endpoint) {
  const deadline = Date.now() + WECHAT_ARCHIVE_MAX_WAIT_MS;
  let networkFailures = 0;

  for (let attempt = 0; attempt < WECHAT_ARCHIVE_MAX_ATTEMPTS; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      return null;
    }

    const controller = new AbortController();
    let timer = window.setTimeout(
      () => controller.abort(),
      Math.max(1, Math.min(WECHAT_ARCHIVE_REQUEST_TIMEOUT_MS, remainingMs))
    );

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: parsed.canonicalUrl }),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });

      if (response.status === 202) {
        const pending = await response.json().catch(() => null);

        if (!pending?.pending || attempt + 1 >= WECHAT_ARCHIVE_MAX_ATTEMPTS) {
          return null;
        }

        window.clearTimeout(timer);
        timer = null;
        await waitForWeChatRetry(
          Math.min(getWeChatRetryDelayMs(response, pending), deadline - Date.now())
        );
        continue;
      }

      if (!response.ok) {
        return null;
      }

      return normalizeWeChatArchivePayload(await response.json(), parsed);
    } catch {
      networkFailures += 1;
      if (
        networkFailures >= WECHAT_ARCHIVE_MAX_NETWORK_FAILURES ||
        attempt + 1 >= WECHAT_ARCHIVE_MAX_ATTEMPTS ||
        Date.now() >= deadline
      ) {
        return null;
      }

      window.clearTimeout(timer);
      timer = null;
      await waitForWeChatRetry(
        Math.min(WECHAT_ARCHIVE_RETRY_DELAY_MS, deadline - Date.now())
      );
    } finally {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    }
  }

  return null;
}

function getExpandReaderEndpoint() {
  const endpoint = getStringSetting("expand_reader_endpoint", DEFAULT_READER_ENDPOINT).trim();

  if (!endpoint) {
    return "";
  }

  try {
    const url = new URL(endpoint);
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

    /* HTTPS in production; a loopback endpoint is allowed so the component can be
       developed against a local instance of the reader service. */
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) ||
      url.username ||
      url.password
    ) {
      return "";
    }

    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function supportsExpandReader(parsed) {
  const supportedSource =
    (parsed?.kind === "marxists" && parsed.contentType === "document") ||
    (parsed?.kind === "zhihu" && getBooleanSetting("enable_zhihu_summary", true));

  return Boolean(
    supportedSource &&
      getBooleanSetting("enable_expand_reader", true) &&
      getExpandReaderEndpoint()
  );
}

function getReaderCacheKey(canonicalUrl, endpoint = getExpandReaderEndpoint()) {
  try {
    const source = new URL(canonicalUrl);

    source.hash = "";
    return `${endpoint}\n${source.toString()}`;
  } catch {
    return `${endpoint}\n${canonicalUrl}`;
  }
}

function getCachedReaderRequest(cacheKey, now = Date.now()) {
  const entry = readerViewCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now) {
    readerViewCache.delete(cacheKey);
    return null;
  }

  /* Map insertion order is the LRU order. Refresh it without extending the TTL. */
  readerViewCache.delete(cacheKey);
  readerViewCache.set(cacheKey, entry);
  return entry.promise;
}

function storeReaderRequest(cacheKey, promise, now = Date.now()) {
  for (const [key, entry] of readerViewCache) {
    if (entry.expiresAt <= now) {
      readerViewCache.delete(key);
    }
  }

  readerViewCache.delete(cacheKey);
  const entry = {
    expiresAt: now + READER_CACHE_TTL_MS,
    promise,
  };
  readerViewCache.set(cacheKey, entry);

  while (readerViewCache.size > READER_CACHE_MAX_ENTRIES) {
    readerViewCache.delete(readerViewCache.keys().next().value);
  }

  return entry;
}

async function fetchReaderView(canonicalUrl) {
  const endpoint = getExpandReaderEndpoint();

  if (!endpoint) {
    return null;
  }

  const cacheKey = getReaderCacheKey(canonicalUrl, endpoint);
  const cached = getCachedReaderRequest(cacheKey);

  if (cached) {
    return cached;
  }

  const request = (async () => {
    const requestUrl = new URL(endpoint);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), READER_TIMEOUT_MS);

    requestUrl.searchParams.set("url", canonicalUrl);

    try {
      const response = await fetch(requestUrl.toString(), {
        method: "GET",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();

      return payload?.ok && typeof payload.html === "string" ? payload : null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  })();

  const entry = storeReaderRequest(cacheKey, request);
  const result = await request;

  /* A transient failure must not poison this URL until the SPA is hard-reloaded. */
  if (!result && readerViewCache.get(cacheKey) === entry) {
    readerViewCache.delete(cacheKey);
  }

  return result;
}

function getReaderFragmentToken(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  let decoded = raw;

  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* Keep the literal token when the source contains malformed percent escapes. */
  }

  return encodeURIComponent(decoded)
    .replace(/%/g, "_")
    .replace(/[^a-z0-9_.:-]/gi, "_")
    .slice(0, 180);
}

function getScopedReaderFragment(value, idPrefix) {
  const token = getReaderFragmentToken(String(value || "").replace(/^#/, ""));

  return token ? `${idPrefix}${token}` : "";
}

function sanitizeReaderExternalUrl(value) {
  try {
    const url = new URL(String(value || "").trim());

    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function sanitizeReaderImageUrl(value, sourceUrl) {
  try {
    const imageUrl = new URL(String(value || "").trim());
    const source = new URL(sourceUrl);
    const sourceHost = source.hostname.toLowerCase();

    if (ZHIHU_HOSTS.has(sourceHost)) {
      return "";
    }

    const allowedHosts = MARXISTS_HOSTS.has(sourceHost) ? MARXISTS_HOSTS : new Set([sourceHost]);

    if (
      !["http:", "https:"].includes(imageUrl.protocol) ||
      imageUrl.username ||
      imageUrl.password ||
      !allowedHosts.has(imageUrl.hostname.toLowerCase())
    ) {
      return "";
    }

    imageUrl.protocol = "https:";
    imageUrl.port = "";
    imageUrl.hash = "";
    return imageUrl.toString();
  } catch {
    return "";
  }
}

function hardenReaderAnchor(element, idPrefix) {
  const href = String(element.getAttribute("href") || "").trim();

  element.removeAttribute("target");
  element.removeAttribute("rel");

  if (href.startsWith("#")) {
    const scopedFragment = getScopedReaderFragment(href, idPrefix);

    if (scopedFragment) {
      element.setAttribute("href", `#${scopedFragment}`);
    } else {
      element.removeAttribute("href");
    }
  } else {
    const externalUrl = sanitizeReaderExternalUrl(href);

    if (externalUrl) {
      element.setAttribute("href", externalUrl);
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener nofollow ugc");
    } else {
      element.removeAttribute("href");
    }
  }

  for (const attribute of ["id", "name"]) {
    const scopedIdentifier = getScopedReaderFragment(element.getAttribute(attribute), idPrefix);

    if (scopedIdentifier) {
      element.setAttribute(attribute, scopedIdentifier);
    } else {
      element.removeAttribute(attribute);
    }
  }
}

function hardenReaderImage(element, sourceUrl) {
  const safeSource = sanitizeReaderImageUrl(element.getAttribute("src"), sourceUrl);

  if (!safeSource) {
    element.remove();
    return false;
  }

  element.setAttribute("src", safeSource);
  element.setAttribute("loading", "lazy");
  element.setAttribute("referrerpolicy", "no-referrer");
  return true;
}

function sanitizeReaderFragment(html, sourceUrl, idPrefix) {
  if (!globalThis.DOMParser) {
    return null;
  }

  const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = parsed.body?.firstElementChild;

  if (!root) {
    return null;
  }

  for (const element of Array.from(root.querySelectorAll("*"))) {
    const tag = element.tagName.toLowerCase();

    if (READER_DROP_TAGS.has(tag)) {
      element.remove();
      continue;
    }

    if (!READER_KEEP_TAGS.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    const allowed = READER_ALLOWED_ATTRIBUTES[tag] || [];

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();

      if (!allowed.includes(name)) {
        element.removeAttribute(attribute.name);
      }
    }

    if (tag === "a") {
      hardenReaderAnchor(element, idPrefix);
    } else if (tag === "img" && !hardenReaderImage(element, sourceUrl)) {
      continue;
    }
  }

  return root;
}

function buildReaderPane(wrapper, view, resolvedTitle = "") {
  const state = wrapperState.get(wrapper);
  const sourceUrl = state?.parsed?.canonicalUrl || "";
  const isZhihuSummary = state?.parsed?.provider === "zhihu";
  const idPrefix = `bili-reader-${++readerFragmentSequence}-`;
  const fragment = sanitizeReaderFragment(view.html, sourceUrl, idPrefix);

  if (!fragment || !normalizeTitleText(fragment.textContent || "")) {
    return null;
  }

  const pane = createElement("div", "bilibili-inline-player__reader-pane");
  const article = createElement("article", "bilibili-inline-player__reader-article");

  pane.tabIndex = 0;
  pane.setAttribute("role", "region");
  pane.setAttribute(
    "aria-label",
    `${resolvedTitle || wrapper.dataset.bilibiliTitle || (isZhihuSummary ? "知乎" : "马克思主义文库")}${
      isZhihuSummary ? "摘要" : "原文"
    }`
  );
  article.lang = view.lang || "";
  article.append(...Array.from(fragment.childNodes));
  pane.appendChild(article);
  pane.style.setProperty(
    "--bili-reader-height",
    `${getBoundedIntegerSetting("expand_reader_height", DEFAULT_READER_PANE_HEIGHT, 240, 1200)}px`
  );

  if (view.truncated) {
    pane.appendChild(
      createElement(
        "div",
        "bilibili-inline-player__reader-truncated",
        isZhihuSummary
          ? "摘要过长，此处只显示前一部分，完整内容请用下方链接打开知乎。"
          : "原文过长，此处只展开了前一部分，完整内容请用下方链接打开原站。"
      )
    );
  }

  return pane;
}

function buildWeChatArchivePane(wrapper, archive) {
  const pane = createElement(
    "div",
    "bilibili-inline-player__reader-pane bilibili-inline-player__wechat-pane"
  );
  const iframe = createElement("iframe", "bilibili-inline-player__wechat-frame");
  const title = archive.title || wrapper.dataset.bilibiliTitle || "微信公号文章";

  pane.tabIndex = 0;
  pane.setAttribute("role", "region");
  pane.setAttribute("aria-label", `${title}全文`);
  pane.style.setProperty(
    "--bili-wechat-height",
    `${getBoundedIntegerSetting("wechat_embed_height", 720, 360, 1400)}px`
  );

  iframe.src = archive.archiveUrl;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer";
  iframe.sandbox = "allow-popups allow-popups-to-escape-sandbox";
  iframe.title = `${title} — wx.bdfz.net 全文`;
  pane.appendChild(iframe);
  return pane;
}

async function expandWeChatArchive(wrapper) {
  const state = wrapperState.get(wrapper);

  if (
    !state?.parsed ||
    !supportsWeChatArchive(state.parsed) ||
    wrapper.dataset.bilibiliWechatDone === "1"
  ) {
    return;
  }

  wrapper.dataset.bilibiliWechatDone = "1";
  wrapper.classList.add("bilibili-inline-player--reader-loading");
  wrapper.setAttribute("aria-busy", "true");

  const status = wrapper.querySelector(".bilibili-inline-player__reading-status");
  const archive = await fetchWeChatArchive(state.parsed);

  wrapper.classList.remove("bilibili-inline-player--reader-loading");
  wrapper.setAttribute("aria-busy", "false");

  if (!wrapper.isConnected) {
    return;
  }

  if (!archive) {
    if (status) {
      status.textContent = "微信全文暂时无法转换，请使用下方链接打开原文。";
      status.classList.add("bilibili-inline-player__reading-status--error");
    }
    return;
  }

  if (archive.title) {
    wrapper.dataset.bilibiliTitle = archive.title;
    state.title = archive.title;
    const heading = wrapper.querySelector(".bilibili-inline-player__reading-title");

    if (heading) {
      heading.textContent = archive.title;
    }
  }

  const pane = buildWeChatArchivePane(wrapper, archive);
  status?.remove();
  wrapper.classList.add("bilibili-inline-player--reader-open");
  wrapper.querySelector(".bilibili-inline-player__reading-body")?.insertAdjacentElement(
    "afterend",
    pane
  );

  const footerActions = wrapper.querySelector(".bilibili-inline-player__footer-actions");

  if (footerActions && !footerActions.querySelector("[data-wechat-archive-link]")) {
    const archiveLink = createElement(
      "a",
      "bilibili-inline-player__footer-link",
      "在 wx.bdfz.net 打开全文"
    );
    archiveLink.href = archive.archiveUrl;
    archiveLink.target = "_blank";
    archiveLink.rel = "noopener nofollow ugc";
    archiveLink.dataset.wechatArchiveLink = "1";
    footerActions.prepend(archiveLink);
  }
}

function isMatchingReaderView(view, parsed) {
  if (!view?.ok || typeof view.html !== "string" || !parsed?.canonicalUrl) {
    return false;
  }

  if (parsed.provider !== "zhihu") {
    return true;
  }

  const expectedId = String(parsed.answerId || parsed.articleId || parsed.questionId || "");

  return (
    view.provider === "zhihu" &&
    view.summaryOnly === true &&
    view.contentType === parsed.contentType &&
    String(view.contentId || "") === expectedId &&
    normalizeUrlLikeString(view.url) === parsed.canonicalUrl
  );
}

function resolveReaderViewTitle(view, parsed, fallbackTitle = "") {
  const title = cleanProviderTitle(view?.title || "", parsed);

  if (title && !isGenericTitle(title)) {
    return title;
  }

  return normalizeTitleText(fallbackTitle);
}

async function expandThroughReader(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!state?.parsed || !supportsExpandReader(state.parsed) || wrapper.dataset.bilibiliReaderDone === "1") {
    return;
  }

  wrapper.dataset.bilibiliReaderDone = "1";
  wrapper.classList.add("bilibili-inline-player--reader-loading");
  wrapper.setAttribute("aria-busy", "true");

  const status = wrapper.querySelector(".bilibili-inline-player__reading-status");

  const fetchedView = await fetchReaderView(state.parsed.canonicalUrl);
  const view = isMatchingReaderView(fetchedView, state.parsed) ? fetchedView : null;

  wrapper.classList.remove("bilibili-inline-player--reader-loading");
  wrapper.setAttribute("aria-busy", "false");

  if (!wrapper.isConnected) {
    return;
  }

  const resolvedTitle = resolveReaderViewTitle(
    view,
    state.parsed,
    wrapper.dataset.bilibiliTitle
  );

  const pane = view ? buildReaderPane(wrapper, view, resolvedTitle) : null;

  if (!pane) {
    if (status) {
      status.textContent = state.parsed.provider === "zhihu"
        ? "知乎摘要暂时无法读取，请使用下方链接打开原文。"
        : "原文暂时无法展开，请使用下方链接打开原站。";
      status.classList.add("bilibili-inline-player__reading-status--error");
    }
    return;
  }

  if (resolvedTitle) {
    wrapper.dataset.bilibiliTitle = resolvedTitle;
    state.title = resolvedTitle;

    const heading = wrapper.querySelector(".bilibili-inline-player__reading-title");

    if (heading) {
      heading.textContent = resolvedTitle;
    }
  }

  status?.remove();
  wrapper.classList.add("bilibili-inline-player--reader-open");
  wrapper.querySelector(".bilibili-inline-player__reading-body")?.insertAdjacentElement("afterend", pane);
}

function renderMarxistsMediaPlayer(wrapper, { allowAutoplay = false } = {}) {
  const state = wrapperState.get(wrapper);

  if (!state?.parsed || !isMarxistsInlineMedia(state.parsed)) {
    return;
  }

  const isVideo = state.parsed.contentType === "video";
  const title = wrapper.dataset.bilibiliTitle || getFallbackTitle(state.parsed);

  wrapper.dataset.bilibiliLoading = "0";
  wrapper.dataset.bilibiliLoaded = "1";
  wrapper.classList.remove("bilibili-inline-player--loading");

  const shell = createElement(
    "div",
    `bilibili-inline-player__native-media bilibili-inline-player__native-media--${isVideo ? "video" : "audio"}`
  );
  const caption = createElement("div", "bilibili-inline-player__native-media-title", title);
  const element = createElement(isVideo ? "video" : "audio", "bilibili-inline-player__native-media-element");
  const status = createElement("div", "bilibili-inline-player__native-media-status", "");

  element.src = state.parsed.canonicalUrl;
  element.controls = true;
  element.preload = "metadata";
  element.playsInline = true;
  element.title = title;

  element.addEventListener(
    "error",
    () => {
      status.textContent = "浏览器无法直接播放该文件，请用下方链接在马克思主义文库打开。";
      status.classList.add("bilibili-inline-player__native-media-status--error");
    },
    { once: true }
  );

  shell.append(caption, element, status);
  wrapper.classList.remove("bilibili-inline-player--compact-audio");
  wrapper.replaceChildren(shell, buildLoadedFooter(wrapper));
  updateFooterMeta(wrapper);

  if (allowAutoplay) {
    element.play?.()?.catch?.(() => {});
  }
}

function updateBdfzPostExpandedState(wrapper, frameWrap, button, expanded) {
  frameWrap.hidden = !expanded;
  wrapper.dataset.bilibiliExpanded = expanded ? "1" : "0";
  wrapper.classList.toggle("bilibili-inline-player--collapsed", !expanded);
  button.textContent = expanded ? "收起正文" : "展开正文";
  button.setAttribute("aria-expanded", expanded ? "true" : "false");
  button.setAttribute("aria-label", expanded ? "收起 BDFZ 博文正文" : "展开 BDFZ 博文正文");
}

function getBdfzPostAutoScale(containerWidth) {
  const width = Number(containerWidth);

  if (!Number.isFinite(width) || width <= 0) {
    return 1;
  }

  return Math.min(
    1,
    Math.max(BDFZ_POST_AUTO_SCALE_MIN, width / BDFZ_POST_AUTO_SCALE_REFERENCE_WIDTH)
  );
}

function attachBdfzPostAutoScale(wrapper, frameWrap) {
  if (!getBooleanSetting("enable_bdfz_post_auto_scale", true)) {
    wrapper.dataset.bilibiliScaleMode = "original";
    frameWrap.style.setProperty("--bili-bdfz-scale", "1");
    return;
  }

  const updateScale = () => {
    const width = frameWrap.getBoundingClientRect?.().width || frameWrap.clientWidth || 0;

    if (width <= 0) {
      return;
    }

    const scale = getBdfzPostAutoScale(width);
    wrapper.dataset.bilibiliScaleMode = "auto";
    wrapper.dataset.bilibiliScale = scale.toFixed(3);
    frameWrap.style.setProperty("--bili-bdfz-scale", String(scale));
  };

  updateScale();

  if (typeof ResizeObserver === "function") {
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(frameWrap);
  }
}

function getDouyinPlayerScale(containerWidth) {
  const width = Number(containerWidth);

  if (!Number.isFinite(width) || width <= 0) {
    return 1;
  }

  return Math.min(1, width / DOUYIN_PLAYER_WIDTH);
}

function attachDouyinPlayerScale(wrapper, frameWrap) {
  const updateScale = () => {
    const width = frameWrap.getBoundingClientRect?.().width || frameWrap.clientWidth || 0;

    if (width <= 0) {
      return;
    }

    const scale = getDouyinPlayerScale(width);
    wrapper.dataset.bilibiliScaleMode = scale < 1 ? "fit" : "original";
    wrapper.dataset.bilibiliScale = scale.toFixed(3);
    frameWrap.style.setProperty("--bili-douyin-scale", String(scale));
  };

  updateScale();

  if (typeof ResizeObserver === "function") {
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(frameWrap);
  }
}

function attachBdfzPostToggle(wrapper, frameWrap, footer) {
  const actions = footer.querySelector(".bilibili-inline-player__footer-actions");

  if (!actions) {
    return;
  }

  const button = createElement(
    "button",
    "bilibili-inline-player__footer-button bilibili-inline-player__collapse-button",
    "收起正文"
  );
  const frameId = `bili-bdfz-post-${++bdfzPostFrameSequence}`;

  button.type = "button";
  button.setAttribute("aria-controls", frameId);
  frameWrap.id = frameId;
  updateBdfzPostExpandedState(wrapper, frameWrap, button, true);
  button.addEventListener("click", () => {
    updateBdfzPostExpandedState(
      wrapper,
      frameWrap,
      button,
      button.getAttribute("aria-expanded") !== "true"
    );
  });
  actions.prepend(button);
}

function renderLoadedPlayer(wrapper, iframeUrl, { allowAutoplay = false } = {}) {
  const state = wrapperState.get(wrapper);

  if (!state?.parsed || !iframeUrl) {
    return;
  }

  wrapper.dataset.bilibiliLoading = "0";
  wrapper.dataset.bilibiliLoaded = "1";
  wrapper.classList.remove("bilibili-inline-player--loading");

  const frameWrap = createElement("div", "bilibili-inline-player__frame-wrap");
  const iframe = createElement("iframe", "bilibili-inline-player__frame");
  const frameHeight = getLoadedFrameHeight(state.parsed);

  if (frameHeight > 0) {
    frameWrap.classList.add("bilibili-inline-player__frame-wrap--fixed");
    frameWrap.style.setProperty("--bili-frame-height", `${frameHeight}px`);
  } else {
    frameWrap.style.setProperty(
      "--bili-aspect-ratio",
      state.parsed.provider === "douyin"
        ? DOUYIN_PLAYER_ASPECT_RATIO
        : DEFAULT_ASPECT_RATIO
    );
  }

  iframe.src = iframeUrl;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allow = allowAutoplay
    ? "autoplay; fullscreen; picture-in-picture"
    : "fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.title = wrapper.dataset.bilibiliTitle || getEmbedTitle(state.parsed);

  if (state.parsed.provider === "xiaohongshu") {
    iframe.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";
  }

  if (state.parsed.provider === "bdfz-post") {
    iframe.referrerPolicy = "no-referrer";
    iframe.sandbox = "allow-popups allow-popups-to-escape-sandbox";
  }

  frameWrap.appendChild(iframe);

  wrapper.classList.remove("bilibili-inline-player--compact-audio");
  const footer = buildLoadedFooter(wrapper);

  if (state.parsed.provider === "bdfz-post") {
    attachBdfzPostToggle(wrapper, frameWrap, footer);
  }

  wrapper.replaceChildren(frameWrap, footer);

  if (state.parsed.provider === "bdfz-post") {
    attachBdfzPostAutoScale(wrapper, frameWrap);
  } else if (state.parsed.provider === "douyin") {
    attachDouyinPlayerScale(wrapper, frameWrap);
  }

  updateRetryButtonLabel(wrapper);
  updateFooterMeta(wrapper);
  maybeAttachStuckHelpNotice(wrapper);
}

function maybeAutoEmbedFallbackMusicCard(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!state?.parsed || wrapper.dataset.bilibiliLoaded === "1" || wrapper.dataset.bilibiliLoading === "1") {
    return;
  }

  const fallbackAllowed =
    (state.parsed.kind === "netease" && state.parsed.mediaType === "song") ||
    (state.parsed.kind === "qqmusic" && state.parsed.mediaType === "song" && state.parsed.idType === "id");

  if (!fallbackAllowed) {
    return;
  }

  const iframeUrl = state.noAutoplayIframeUrl || state.standardIframeUrl || state.iframeUrl;

  if (!iframeUrl) {
    return;
  }

  renderLoadedPlayer(wrapper, iframeUrl);
}

function maybeResolveMusicPreviewMetadata(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!state?.parsed || !isCompactAudio(state.parsed) || state.previewMetadataPromise) {
    return;
  }

  const currentTitle = wrapper.dataset.bilibiliTitle || state.title || "";

  if (!isPlaceholderTitle(currentTitle, state.parsed)) {
    return;
  }

  if (state.parsed.kind === "qqmusic" && state.parsed.mediaType === "song") {
    state.previewMetadataPromise = fetchQQMusicSongInfo(state.parsed)
      .then((song) => {
        updateQQMusicPreviewMetadata(wrapper, song);
      })
      .catch(() => {
        maybeAutoEmbedFallbackMusicCard(wrapper);
      });
    return;
  }

  if (state.parsed.kind === "netease" && state.parsed.mediaType === "song") {
    state.previewMetadataPromise = Promise.resolve().then(() => {
      maybeAutoEmbedFallbackMusicCard(wrapper);
    });
  }
}

function loadThemeModule(assetName, ready) {
  if (ready()) {
    return Promise.resolve();
  }

  if (themeModulePromises.has(assetName)) {
    return themeModulePromises.get(assetName);
  }

  const assetUrl = getThemeUploadUrl(assetName);

  if (!assetUrl) {
    return Promise.reject(new Error(`Missing theme asset: ${assetName}`));
  }

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = assetUrl;
    script.async = true;
    script.addEventListener("load", () => (ready() ? resolve() : reject(new Error("Module did not register"))), {
      once: true,
    });
    script.addEventListener("error", () => reject(new Error("Module failed to load")), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    themeModulePromises.delete(assetName);
    throw error;
  });

  themeModulePromises.set(assetName, promise);
  return promise;
}

function getMaxEbookBytes() {
  return (
    getBoundedIntegerSetting(
      "max_ebook_size_mb",
      DEFAULT_MAX_EBOOK_SIZE_MB,
      1,
      100
    ) * BYTES_PER_MEBIBYTE
  );
}

async function fetchEbookFile(parsed) {
  const maxBytes = getMaxEbookBytes();
  const response = await fetch(parsed.canonicalUrl, {
    credentials: "same-origin",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Attachment request failed (${response.status})`);
  }

  const declaredBytes = Number.parseInt(response.headers.get("content-length") || "", 10);

  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    throw new RangeError("Ebook exceeds the inline reader size limit");
  }

  const blob = await response.blob();

  if (blob.size > maxBytes) {
    throw new RangeError("Ebook exceeds the inline reader size limit");
  }

  return new File([blob], parsed.filename, {
    type: blob.type || EBOOK_MIME_TYPES[parsed.format] || "application/octet-stream",
  });
}

function formatEbookMetadataValue(value) {
  if (Array.isArray(value)) {
    return value.map(formatEbookMetadataValue).filter(Boolean).join(" / ");
  }

  if (value && typeof value === "object") {
    if (value.name) {
      return formatEbookMetadataValue(value.name);
    }

    const firstValue = Object.values(value).find(Boolean);
    return formatEbookMetadataValue(firstValue);
  }

  return typeof value === "string" ? normalizeTitleText(value) : "";
}

function flattenEbookToc(items, depth = 0, result = []) {
  for (const item of items || []) {
    if (item?.href) {
      result.push({
        href: item.href,
        label: `${"　".repeat(depth)}${formatEbookMetadataValue(item.label) || "未命名章节"}`,
      });
    }

    flattenEbookToc(item?.subitems || item?.children, depth + 1, result);
  }

  return result;
}

function sanitizeEbookCss(source) {
  return String(source ?? "")
    .replace(/@import\s+[^;]+;?/giu, "")
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/giu, (match, quote, value) =>
      /^(?:https?:|\/\/|javascript:)/iu.test(value.trim()) ? 'url("")' : match
    );
}

async function sanitizeEbookResource(data, type = "") {
  const normalizedType = String(type).toLowerCase();
  const wasBlob = data instanceof Blob;

  if (normalizedType.includes("css")) {
    const source = wasBlob ? await data.text() : String(data ?? "");
    const sanitized = sanitizeEbookCss(source);
    return wasBlob ? new Blob([sanitized], { type: data.type }) : sanitized;
  }

  const isMarkup =
    normalizedType.includes("html") ||
    normalizedType.includes("xhtml") ||
    normalizedType.includes("svg+xml");

  if (!isMarkup || !globalThis.DOMParser || !globalThis.XMLSerializer) {
    return data;
  }

  const source = wasBlob ? await data.text() : String(data ?? "");
  const xmlMode = normalizedType.includes("xhtml") || normalizedType.includes("svg+xml");
  const parser = new DOMParser();
  const documentType = normalizedType.includes("svg+xml")
    ? "image/svg+xml"
    : xmlMode
      ? "application/xhtml+xml"
      : "text/html";
  const parsed = parser.parseFromString(source, documentType);

  if (parsed.querySelector("parsererror")) {
    return "";
  }

  for (const element of parsed.querySelectorAll(
    "script, iframe, object, embed, base, foreignObject, form, input, button, textarea, select, meta[http-equiv]"
  )) {
    element.remove();
  }

  for (const element of parsed.querySelectorAll("*")) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      const isUrlAttribute = [
        "action",
        "data",
        "formaction",
        "poster",
        "src",
        "srcset",
        "xlink:href",
      ].includes(name);
      const isExternalOrActiveUrl = /^(?:https?:|\/\/|javascript:)/iu.test(value);

      if (
        name.startsWith("on") ||
        name === "autoplay" ||
        (name === "href" && value.startsWith("javascript:")) ||
        (isUrlAttribute && isExternalOrActiveUrl)
      ) {
        element.removeAttribute(attribute.name);
      } else if (name === "style") {
        element.setAttribute(attribute.name, sanitizeEbookCss(attribute.value));
      }
    }
  }

  const sanitized = xmlMode
    ? new XMLSerializer().serializeToString(parsed)
    : parsed.documentElement.outerHTML;

  return wasBlob ? new Blob([sanitized], { type: data.type }) : sanitized;
}

function buildEbookReaderShell(wrapper, state) {
  const reader = createElement("section", "bilibili-inline-player__ebook-reader");
  const toolbar = createElement("div", "bilibili-inline-player__ebook-toolbar");
  const previous = createElement("button", "bilibili-inline-player__ebook-button", "上一页");
  const title = createElement(
    "div",
    "bilibili-inline-player__ebook-title",
    wrapper.dataset.bilibiliTitle || state.parsed.filename
  );
  const toc = document.createElement("select");
  const next = createElement("button", "bilibili-inline-player__ebook-button", "下一页");
  const viewport = createElement("div", "bilibili-inline-player__ebook-viewport");
  const status = createElement("div", "bilibili-inline-player__ebook-status", "正在安全加载电子书…");
  const download = createElement("a", "bilibili-inline-player__footer-link", "下载原文件");
  const footer = createElement("div", "bilibili-inline-player__ebook-footer");

  previous.type = "button";
  next.type = "button";
  previous.disabled = true;
  next.disabled = true;
  toc.className = "bilibili-inline-player__ebook-toc";
  toc.disabled = true;
  toc.setAttribute("aria-label", "电子书目录");
  toc.appendChild(new Option("目录", ""));
  download.href = state.parsed.canonicalUrl;
  download.target = "_blank";
  download.rel = "noopener nofollow ugc";
  reader.style.setProperty(
    "--ebook-reader-height",
    `${getBoundedIntegerSetting("ebook_reader_height", DEFAULT_EBOOK_READER_HEIGHT, 360, 1000)}px`
  );
  toolbar.append(previous, title, toc, next);
  footer.append(status, download);
  reader.append(toolbar, viewport, footer);
  wrapper.replaceChildren(reader);

  return { reader, previous, title, toc, next, viewport, status };
}

function ensureEbookCleanupObserver() {
  if (ebookCleanupObserver || typeof MutationObserver === "undefined" || !document.body) {
    return;
  }

  ebookCleanupObserver = new MutationObserver(() => {
    for (const [wrapper, view] of activeEbookReaders) {
      if (!wrapper.isConnected) {
        view.close?.();
        activeEbookReaders.delete(wrapper);
      }
    }

    if (activeEbookReaders.size === 0) {
      ebookCleanupObserver.disconnect();
      ebookCleanupObserver = null;
    }
  });
  ebookCleanupObserver.observe(document.body, { childList: true, subtree: true });
}

function handleEbookArrowKey(event, view) {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    view.goLeft();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    view.goRight();
  }
}

async function activateEbookReader(wrapper) {
  if (wrapper.dataset.bilibiliLoaded === "1" || wrapper.dataset.bilibiliLoading === "1") {
    return;
  }

  const state = wrapperState.get(wrapper);

  if (!state?.parsed || state.parsed.kind !== "ebook") {
    return;
  }

  if (!getBooleanSetting("enable_ebook_reader", true)) {
    window.open(state.parsed.canonicalUrl, "_blank", "noopener,noreferrer");
    return;
  }

  wrapper.dataset.bilibiliLoading = "1";
  wrapper.classList.add("bilibili-inline-player--loading");
  const shell = buildEbookReaderShell(wrapper, state);

  try {
    await loadThemeModule("foliate_reader", () => Boolean(customElements.get("foliate-view")));
    const file = await fetchEbookFile(state.parsed);
    const view = document.createElement("foliate-view");

    view.addEventListener("external-link", (event) => {
      event.preventDefault();

      try {
        const externalUrl = new URL(event.detail?.href_, state.parsed.canonicalUrl);

        if (["http:", "https:"].includes(externalUrl.protocol)) {
          window.open(externalUrl.toString(), "_blank", "noopener,noreferrer");
        }
      } catch {
        // Ignore malformed links embedded in untrusted books.
      }
    });
    view.addEventListener("load", (event) => {
      event.detail?.doc?.addEventListener("keydown", (keyEvent) => handleEbookArrowKey(keyEvent, view));
    });
    view.addEventListener("relocate", (event) => {
      const fraction = Number(event.detail?.fraction);
      const chapter = formatEbookMetadataValue(event.detail?.tocItem?.label);
      const progress = Number.isFinite(fraction) ? `${Math.round(fraction * 100)}%` : "阅读中";
      shell.status.textContent = chapter ? `${progress} · ${chapter}` : progress;
    });

    shell.viewport.appendChild(view);
    activeEbookReaders.set(wrapper, view);
    ensureEbookCleanupObserver();
    await view.open(file);

    view.book.transformTarget?.addEventListener("load", ({ detail }) => {
      if (detail.isScript) {
        detail.allow = false;
      }
    });
    view.book.transformTarget?.addEventListener("data", ({ detail }) => {
      detail.data = Promise.resolve(detail.data).then((data) => sanitizeEbookResource(data, detail.type));
    });
    view.renderer?.setStyles?.(`
      html { color-scheme: light dark; }
      body { line-height: 1.65; padding: 0 1rem; }
      img, svg, video { max-width: 100%; max-height: 100%; }
      pre { white-space: pre-wrap !important; }
    `);

    const bookTitle = formatEbookMetadataValue(view.book.metadata?.title);
    const bookAuthor = formatEbookMetadataValue(view.book.metadata?.author);

    if (bookTitle) {
      shell.title.textContent = bookAuthor ? `${bookTitle} — ${bookAuthor}` : bookTitle;
      wrapper.dataset.bilibiliTitle = bookTitle;
    }

    for (const item of flattenEbookToc(view.book.toc)) {
      shell.toc.appendChild(new Option(item.label, item.href));
    }

    shell.toc.disabled = shell.toc.options.length <= 1;
    shell.previous.disabled = false;
    shell.next.disabled = false;
    shell.previous.addEventListener("click", () => view.goLeft());
    shell.next.addEventListener("click", () => view.goRight());
    shell.toc.addEventListener("change", () => {
      if (shell.toc.value) {
        view.goTo(shell.toc.value);
      }
    });
    shell.reader.tabIndex = 0;
    shell.reader.addEventListener("keydown", (event) => handleEbookArrowKey(event, view));
    await view.init({ showTextStart: true });

    wrapper.dataset.bilibiliLoading = "0";
    wrapper.dataset.bilibiliLoaded = "1";
    wrapper.classList.remove("bilibili-inline-player--loading");
    shell.status.textContent = "已在浏览器本地打开";
  } catch (error) {
    wrapper.dataset.bilibiliLoading = "0";
    wrapper.classList.remove("bilibili-inline-player--loading");
    shell.previous.disabled = true;
    shell.next.disabled = true;
    shell.toc.disabled = true;
    shell.viewport.replaceChildren(
      createElement(
        "div",
        "bilibili-inline-player__ebook-error",
        error instanceof RangeError
          ? `文件超过 ${getMaxEbookBytes() / BYTES_PER_MEBIBYTE} MiB 的内嵌阅读限制，请下载阅读。`
          : "此电子书无法安全内嵌，原文件仍可下载。"
      )
    );
    shell.status.textContent = "内嵌读取失败";
  }
}

async function activatePlayer(wrapper) {
  if (wrapper.dataset.bilibiliLoaded === "1" || wrapper.dataset.bilibiliLoading === "1") {
    return;
  }

  const state = wrapperState.get(wrapper);

  if (state?.parsed?.kind === "ebook") {
    await activateEbookReader(wrapper);
    return;
  }

  if (isMarxistsInlineMedia(state?.parsed)) {
    renderMarxistsMediaPlayer(wrapper, {
      allowAutoplay: getBooleanSetting("autoplay_on_click", true),
    });
    return;
  }

  wrapper.dataset.bilibiliLoading = "1";
  wrapper.classList.add("bilibili-inline-player--loading");

  setButtonLabel(wrapper, "加载中…");

  if (state?.resolvePromise) {
    await state.resolvePromise;
  } else {
    primeEmbedState(wrapper);
    await state?.resolvePromise;
  }

  if (state?.externalOnly || !state?.iframeUrl) {
    wrapper.dataset.bilibiliLoading = "0";
    wrapper.classList.remove("bilibili-inline-player--loading");
    setButtonLabel(wrapper, getOpenLabel(state?.parsed || { provider: "bilibili" }));
    window.open(wrapper.dataset.bilibiliUrl, "_blank", "noopener,noreferrer");
    return;
  }

  renderLoadedPlayer(wrapper, state.iframeUrl, {
    allowAutoplay: getBooleanSetting("autoplay_on_click", true),
  });
}

function collectOneboxCandidates(element) {
  const limit = Math.max(1, getIntegerSetting("max_embeds_per_post", 4));
  const results = [];

  for (const block of element.querySelectorAll("aside.onebox[data-onebox-src], article.onebox[data-onebox-src]")) {
    if (results.length >= limit) {
      break;
    }

    if (block.dataset.bilibiliInlinePlayer) {
      continue;
    }

    const anchor = block.querySelector("a[href]");
    const parsed = parseFirstSupportedUrl(...collectSourceUrls(block));

    if (!parsed) {
      continue;
    }

    results.push({
      target: block,
      anchor,
      parsed,
    });
  }

  return results;
}

function collectSourceUrls(target) {
  const urls = [];

  if (target.dataset?.oneboxSrc) {
    urls.push(target.dataset.oneboxSrc);
  }

  for (const anchor of target.querySelectorAll("a[href]")) {
    urls.push(anchor.href);
  }

  for (const iframe of target.querySelectorAll("iframe[src]")) {
    urls.push(iframe.src);
  }

  urls.push(...extractUrlsFromText(target.textContent || ""));

  return [...new Set(urls.map(normalizeUrlLikeString).filter(Boolean))];
}

function collectStandaloneCandidates(element, existingTargets) {
  const limit = Math.max(1, getIntegerSetting("max_embeds_per_post", 4));
  const results = [];
  const seen = new Set(existingTargets);

  for (const anchor of element.querySelectorAll("p > a[href]:only-child")) {
    if (results.length + existingTargets.length >= limit) {
      break;
    }

    const target = anchor.closest("p");

    if (
      !target ||
      seen.has(target) ||
      target.dataset.bilibiliInlinePlayer ||
      anchor.closest("aside.onebox, article.onebox, .bilibili-inline-player") ||
      normalizeTitleText(target.textContent || "") !== normalizeTitleText(anchor.textContent || "")
    ) {
      continue;
    }

    const parsed = parseBilibiliUrl(anchor.href);

    if (!parsed) {
      continue;
    }

    seen.add(target);
    results.push({
      target,
      anchor,
      parsed,
      preserveSource: ["xiaohongshu", "wechat"].includes(parsed.provider),
    });
  }

  return results;
}

function getParagraphVisualSegmentIndex(paragraph, anchor) {
  let directChild = anchor;

  while (directChild?.parentElement && directChild.parentElement !== paragraph) {
    directChild = directChild.parentElement;
  }

  if (!directChild || directChild.parentElement !== paragraph) {
    return -1;
  }

  let segmentIndex = 0;

  for (const child of Array.from(paragraph.children || [])) {
    if (child === directChild) {
      return segmentIndex;
    }

    if (child.tagName === "BR") {
      segmentIndex += 1;
    }
  }

  return -1;
}

/* Paragraph-inline takeover is intentionally limited to one URL-labelled
   anchor per BR-delimited visual segment. This supports multiple copied share
   rows that Discourse cooks into one paragraph while leaving titled prose
   links, same-line navigation clusters, code, block quotes, lists, media,
   PDFs, and every unsupported URL untouched. */
function getVisibleUrlAnchorTarget(anchor) {
  if (
    !anchor?.href ||
    anchor.dataset?.bilibiliInlinePlayer ||
    anchor.closest("pre, code, li, blockquote, nav, aside.onebox, article.onebox, .bilibili-inline-player")
  ) {
    return null;
  }

  const paragraph = anchor.closest("p");

  if (
    !paragraph ||
    paragraph.dataset?.bilibiliInlinePlayer ||
    paragraph.querySelector("img, audio, video, iframe, pre, code")
  ) {
    return null;
  }

  const segmentIndex = getParagraphVisualSegmentIndex(paragraph, anchor);
  const links = Array.from(paragraph.querySelectorAll("a[href]")).filter(
    (link) => getParagraphVisualSegmentIndex(paragraph, link) === segmentIndex
  );

  if (segmentIndex < 0 || links.length !== 1 || links[0] !== anchor) {
    return null;
  }

  const visibleText = normalizeTitleText(anchor.textContent || "")
    .replace(/\s+link clicked \d+ times?$/i, "");
  const cleanedVisibleText = normalizeUrlLikeString(visibleText, {
    trimTrailingPunctuation: true,
  });
  const visibleUrls = extractUrlsFromText(cleanedVisibleText);

  if (visibleUrls.length !== 1) {
    return null;
  }

  const rawHref = anchor.getAttribute?.("href") || anchor.href;
  const parsedHref = parseBilibiliUrl(
    normalizeUrlLikeString(rawHref, { trimTrailingPunctuation: true })
  );
  const parsedVisible = parseBilibiliUrl(visibleUrls[0]);

  if (
    !parsedHref ||
    !parsedVisible ||
    parsedHref.canonicalUrl !== parsedVisible.canonicalUrl
  ) {
    return null;
  }

  return normalizeTitleText(cleanedVisibleText.replace(visibleUrls[0], ""))
    ? null
    : { paragraph, parsed: parsedHref, segmentIndex };
}

function collectVisibleUrlCandidates(element, existingTargets) {
  const limit = Math.max(1, getIntegerSetting("max_embeds_per_post", 4));
  const results = [];
  const blockedTargets = new Set(existingTargets);
  const seenAnchors = new Set();

  for (const anchor of element.querySelectorAll("p a[href]")) {
    if (results.length + existingTargets.length >= limit) {
      break;
    }

    const matched = getVisibleUrlAnchorTarget(anchor);

    if (
      !matched ||
      blockedTargets.has(matched.paragraph) ||
      seenAnchors.has(anchor)
    ) {
      continue;
    }

    seenAnchors.add(anchor);
    results.push({
      target: matched.paragraph,
      markerTarget: anchor,
      anchor,
      parsed: matched.parsed,
      preserveSource: true,
      segmentIndex: matched.segmentIndex,
    });
  }

  return results;
}

function collectEbookAttachmentCandidates(element, existingTargets) {
  const limit = Math.max(1, getIntegerSetting("max_embeds_per_post", 4));
  const results = [];
  const seen = new Set(existingTargets);

  for (const anchor of element.querySelectorAll("a.attachment[href]")) {
    if (results.length + existingTargets.length >= limit) {
      break;
    }

    if (anchor.closest(".bilibili-inline-player, [data-bilibili-inline-player]")) {
      continue;
    }

    const parsed = parseEbookAttachmentUrl(anchor.href);

    if (!parsed) {
      continue;
    }

    const paragraph = anchor.closest("p");
    const target =
      paragraph?.querySelectorAll?.("a.attachment[href]").length === 1 ? paragraph : anchor;

    if (!target || seen.has(target) || target.dataset?.bilibiliInlinePlayer) {
      continue;
    }

    seen.add(target);
    results.push({ target, anchor, parsed });
  }

  return results;
}

function collectIframeCandidates(element, existingTargets) {
  const limit = Math.max(1, getIntegerSetting("max_embeds_per_post", 4));
  const results = [];
  const seen = new Set(existingTargets);

  for (const iframe of element.querySelectorAll("iframe[src]")) {
    if (results.length + existingTargets.length >= limit) {
      break;
    }

    if (iframe.closest(".bilibili-inline-player, [data-bilibili-inline-player]")) {
      continue;
    }

    const target = iframe.closest("p, figure") || iframe.parentElement || iframe;

    if (!target || seen.has(target) || target.dataset?.bilibiliInlinePlayer) {
      continue;
    }

    const parsed = parseBilibiliUrl(iframe.src);

    if (!parsed) {
      continue;
    }

    seen.add(target);
    results.push({ target, anchor: null, parsed });
  }

  return results;
}

function collectEmbedTextCandidates(element, existingTargets) {
  const limit = Math.max(1, getIntegerSetting("max_embeds_per_post", 4));
  const results = [];
  const seen = new Set(existingTargets);

  for (const block of element.querySelectorAll("p")) {
    if (results.length + existingTargets.length >= limit) {
      break;
    }

    if (seen.has(block) || block.dataset?.bilibiliInlinePlayer) {
      continue;
    }

    if (block.querySelector("a[href], iframe[src], aside.onebox, article.onebox, pre, code")) {
      continue;
    }

    const parsed = parseFirstSupportedUrl(...extractUrlsFromText(block.textContent || ""));

    if (!parsed) {
      continue;
    }

    seen.add(block);
    results.push({
      target: block,
      anchor: null,
      parsed,
      preserveSource: true,
    });
  }

  return results;
}

function placeCandidateReplacement(candidate, replacement, insertionCursors = null) {
  const markerTarget = candidate.markerTarget || candidate.target;

  if (candidate.preserveSource) {
    markerTarget.dataset.bilibiliInlinePlayer = "done";
    candidate.target.dataset.bilibiliInlinePlayer = "done";
    const insertionTarget = insertionCursors?.get(candidate.target) || candidate.target;
    insertionTarget.insertAdjacentElement("afterend", replacement);
    insertionCursors?.set(candidate.target, replacement);
  } else {
    candidate.target.replaceWith(replacement);
  }
}

function replaceCandidate(candidate, insertionCursors = null) {
  const markerTarget = candidate.markerTarget || candidate.target;

  markerTarget.dataset.bilibiliInlinePlayer = "processing";
  candidate.target.dataset.bilibiliInlinePlayer = "processing";
  const metadata = buildMetadata(candidate.target, candidate.anchor, candidate.parsed);
  const replacement = buildWrapper(metadata);
  replacement.dataset.bilibiliInlinePlayer = "done";

  placeCandidateReplacement(candidate, replacement, insertionCursors);
  maybeResolveMusicPreviewMetadata(replacement);
}

export default apiInitializer((api) => {
  if (!getBooleanSetting("enabled", true)) {
    return;
  }

  api.decorateCookedElement((element) => {
    const insertionCursors = new WeakMap();
    const oneboxCandidates = collectOneboxCandidates(element);
    const standaloneCandidates = collectStandaloneCandidates(
      element,
      oneboxCandidates.map((candidate) => candidate.target)
    );
    const visibleUrlCandidates = collectVisibleUrlCandidates(
      element,
      [...oneboxCandidates, ...standaloneCandidates].map((candidate) => candidate.target)
    );
    const ebookAttachmentCandidates = collectEbookAttachmentCandidates(
      element,
      [
        ...oneboxCandidates,
        ...standaloneCandidates,
        ...visibleUrlCandidates,
      ].map((candidate) => candidate.target)
    );
    const iframeCandidates = collectIframeCandidates(
      element,
      [
        ...oneboxCandidates,
        ...standaloneCandidates,
        ...visibleUrlCandidates,
        ...ebookAttachmentCandidates,
      ].map((candidate) => candidate.target)
    );
    const embedTextCandidates = collectEmbedTextCandidates(
      element,
      [
        ...oneboxCandidates,
        ...standaloneCandidates,
        ...visibleUrlCandidates,
        ...ebookAttachmentCandidates,
        ...iframeCandidates,
      ].map((candidate) => candidate.target)
    );

    for (const candidate of [
      ...oneboxCandidates,
      ...standaloneCandidates,
      ...visibleUrlCandidates,
      ...ebookAttachmentCandidates,
      ...iframeCandidates,
      ...embedTextCandidates,
    ]) {
      replaceCandidate(candidate, insertionCursors);
    }
  });
});
