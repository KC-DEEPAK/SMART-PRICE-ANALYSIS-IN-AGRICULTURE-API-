export const cropCategoryMap = {
  Tomato: "Vegetables",
  Onion: "Vegetables",
  Potato: "Vegetables",
  "Green Chilli": "Vegetables",
  Brinjal: "Vegetables",
  Carrot: "Vegetables",
  Garlic: "Vegetables",
  Cabbage: "Vegetables",
  Cauliflower: "Vegetables",

  Apple: "Fruits",
  Banana: "Fruits",
  Mango: "Fruits",
  Orange: "Fruits",
  Coconut: "Fruits",

  Paddy: "Grains",
  Rice: "Grains",
  Wheat: "Grains",
  Maize: "Grains",
  Ragi: "Grains",

  Gram: "Pulses",
  "Gram (Chana)": "Pulses",

  Mustard: "Oilseeds",
  Soyabean: "Oilseeds",
  Groundnut: "Oilseeds",

  Turmeric: "Spices",
  "Black Pepper": "Spices",

  Cotton: "Commercial Crops",
  Sugarcane: "Commercial Crops",
  Arecanut: "Commercial Crops"
};

export const getCategory = (crop) => {
  if (!crop) return "Others";
  const name = crop.trim();

  if (cropCategoryMap[name]) {
    return cropCategoryMap[name];
  }

  const lower = name.toLowerCase();

  if (/tomato|onion|potato|chilli|chili|brinjal|eggplant|carrot|garlic|cabbage|cauliflower|capsicum|ginger|cucumber|pumpkin|okra|lady|radish|beetroot|spinach|gourd|pea|bean|shakarkand|sweet potato/i.test(lower)) {
    return "Vegetables";
  }

  if (/apple|banana|mango|orange|papaya|grape|guava|pineapple|pomegranate|watermelon|melon|lemon|lime|chikoo|sapota|fig|coconut|citrus|mosambi/i.test(lower)) {
    return "Fruits";
  }

  if (/paddy|rice|wheat|maize|corn|ragi|jowar|bajra|barley|oats|sorghum|grain|cereal/i.test(lower)) {
    return "Grains";
  }

  if (/gram|chana|tur|arhar|dal|moong|mung|urad|masoor|lentil|chickpea|cowpea|pulse/i.test(lower)) {
    return "Pulses";
  }

  if (/mustard|soyabean|soybean|groundnut|peanut|sunflower|sesame|til|castor|niger|oilseed|linseed/i.test(lower)) {
    return "Oilseeds";
  }

  if (/turmeric|pepper|cardamom|cumin|jeera|coriander|fennel|fenugreek|tamarind|clove|spice|anise/i.test(lower)) {
    return "Spices";
  }

  if (/cotton|sugarcane|arecanut|betel|tobacco|jute|rubber|coffee|tea|silk/i.test(lower)) {
    return "Commercial Crops";
  }

  return "Others";
};
