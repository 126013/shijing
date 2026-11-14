import type { Poet } from '@/lib/data/types';

/**
 * 诗人行迹数据。
 *
 * coord 是行迹图上的示意相对坐标（0-100），用于在抽象「山河」画布上排布节点，
 * 不是地理坐标，不用于、也不能用于任何地理定位或边界表达。
 */
export const poets: Poet[] = [
  {
    id: 'libai',
    name: '李白',
    dynasty: '唐',
    years: '701—762',
    birthplace: '绵州昌隆（今四川江油）',
    coord: { x: 33, y: 55 },
    bio: '字太白，号青莲居士。一生大半在漫游中度过，从蜀中出三峡，东游吴越，北上燕赵。诗里常见月光、瀑布与远行。',
    poemIds: ['jing-ye-si', 'wang-lu-shan-pu-bu'],
  },
  {
    id: 'dufu',
    name: '杜甫',
    dynasty: '唐',
    years: '712—770',
    birthplace: '河南巩县（今河南巩义）',
    coord: { x: 55, y: 45 },
    bio: '字子美，自号少陵野老。安史之乱中辗转流离，后在成都浣花溪畔筑草堂。写雨、写草木，也写人间疾苦。',
    poemIds: ['chun-ye-xi-yu'],
  },
  {
    id: 'wangwei',
    name: '王维',
    dynasty: '唐',
    years: '701—761',
    birthplace: '河东蒲州（今山西永济）',
    coord: { x: 51, y: 40 },
    bio: '字摩诘。晚年隐居蓝田辋川，诗画相通，被称「诗中有画，画中有诗」。山水、明月、竹林是他常用的取景框。',
    poemIds: ['shan-ju-qiu-ming', 'shi-zhi-sai-shang', 'song-yuan-er', 'zhu-li-guan'],
  },
  {
    id: 'mengharan',
    name: '孟浩然',
    dynasty: '唐',
    years: '689—740',
    birthplace: '襄州襄阳（今湖北襄阳）',
    coord: { x: 53, y: 53 },
    bio: '襄陽人，一生大部分时间在故乡鹿门山隐居。写春天的早晨、写田家、写江上的风，语淡而味长。',
    poemIds: ['chun-xiao'],
  },
  {
    id: 'wangzhihuan',
    name: '王之涣',
    dynasty: '唐',
    years: '688—742',
    birthplace: '并州晋阳（今山西太原）',
    coord: { x: 55, y: 32 },
    bio: '以《登鹳雀楼》《凉州词》闻名。存诗不多，却句句开阔，善于把视线推到地平线之外。',
    poemIds: ['deng-guan-que-lou'],
  },
  {
    id: 'liuzongyuan',
    name: '柳宗元',
    dynasty: '唐',
    years: '773—819',
    birthplace: '河东解县（今山西运城）',
    coord: { x: 49, y: 43 },
    bio: '字子厚，唐宋八大家之一。永贞革新失败后贬谪永州、柳州，山水游记与短诗都带着清冷的骨力。',
    poemIds: ['jiang-xue'],
  },
  {
    id: 'zhangji',
    name: '张继',
    dynasty: '唐',
    years: '约715—约779',
    birthplace: '襄州（今湖北襄阳）',
    coord: { x: 57, y: 57 },
    bio: '天宝年间进士。存诗四十余首，最著名的一首写的是苏州城外一个失眠的夜晚。',
    poemIds: ['feng-qiao-ye-bo'],
  },
  {
    id: 'sushi',
    name: '苏轼',
    dynasty: '宋',
    years: '1037—1101',
    birthplace: '眉州眉山（今四川眉山）',
    coord: { x: 30, y: 63 },
    bio: '字子瞻，号东坡居士。一生屡遭贬谪，从杭州到黄州、惠州、儋州，走到哪里写到哪里。',
    poemIds: ['yin-hu-shang', 'ti-xi-lin-bi'],
  },
  {
    id: 'liqingzhao',
    name: '李清照',
    dynasty: '宋',
    years: '1084—约1155',
    birthplace: '齐州章丘（今山东济南）',
    coord: { x: 66, y: 37 },
    bio: '号易安居士，婉约词派代表。早年词作明快，写溪亭、荷花与一滩鸥鹭，像一段可以回放的夏日。',
    poemIds: ['ru-meng-ling'],
  },
  {
    id: 'madaiyuan',
    name: '马致远',
    dynasty: '元',
    years: '约1250—约1321',
    birthplace: '大都（今北京）',
    coord: { x: 62, y: 25 },
    bio: '元曲四大家之一，人称「曲状元」。一首二十八字的小令，把秋天的旅途写成了中国人的共同记忆。',
    poemIds: ['tian-jing-sha'],
  },
];

export function findPoetById(id: string): Poet | undefined {
  return poets.find((poet) => poet.id === id);
}

export function findPoetByName(name: string): Poet | undefined {
  return poets.find((poet) => poet.name === name);
}
