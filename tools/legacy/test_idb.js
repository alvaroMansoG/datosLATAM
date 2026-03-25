async function test() {
  const qLmw = encodeURIComponent(JSON.stringify({Country: "Argentina", Indicator: "Population"}));
  const urlLmw = `https://data.iadb.org/api/3/action/datastore_search?resource_id=0a1eba9e-97dd-426e-b5cc-23a53718f632&filters=${qLmw}&sort=Year%20desc&limit=1`;
  const res1 = await fetch(urlLmw);
  const data1 = await res1.json();
  console.log("LMW Total:", data1.result.total, "Sample:", data1.result.records[0]);
  
  const qSoc = encodeURIComponent(JSON.stringify({country_name_en: "Argentina", indicator: "internet_ch"}));
  const urlSoc = `https://data.iadb.org/api/3/action/datastore_search?resource_id=ba412771-9c90-4613-a96a-e18c005c0ab6&filters=${qSoc}&sort=year%20desc&limit=1`;
  const res2 = await fetch(urlSoc);
  const data2 = await res2.json();
  console.log("SOC Total:", data2?.result?.total, "Sample:", data2?.result?.records?.[0]);
}
test();
