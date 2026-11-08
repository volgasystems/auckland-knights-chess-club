/** Published organiser-confirmed awards, scores checked against Vega event 9314. */
export const inauguralPrizewinners = [
["Boys","1st","Degapudi, Tamoghna Reddy",2,6.5],
["Boys","2nd","Nicholas Salt",62,6],
["Boys","3rd","Lee, Jaden Jhia Xing",5,6],
["Boys","4th","Nimmakayala, Srirama Vikhyath",null,5.5],
["Boys","5th","Abbott, Isaac",8,5.5],
["Girls","1st","Bandara Bodhi Tamaya",40,5.5],
["Girls","2nd","Li, Olivia",4,5],
["Girls","3rd","Tang, Ava",17,5],
["Girls","4th","Jayathilaka, Senadi Vinulya",null,4],
["Girls","5th","Olivia Lee",63,4],
["Boys Under 10","Best U10","Ragulan, Akaran",21,4],
["Boys Under 8","Best U8","Zhai, Sachiel",30,4],
["Girls Under 10","Best U10","Diya Adepu",49,2.5],
["Girls Under 8","Best U8","Isha Mangalapalli",54,3.5],
].map(([category,position,winner_name,id,points])=>({category,position,winner_name,points,prize:"",profile_url:id ? `https://www.vegaresults.com/vega/index.php?page=playercard&id=9314&playerid=${id}` : ""}));

export function withPublishedAwards(t:any) {
 if(t.slug !== "AKCC1" || (Array.isArray(t.tournament_prizes) && t.tournament_prizes.some((p:any)=>p.winner_name))) return t;
 return {...t,tournament_prizes:[...(Array.isArray(t.tournament_prizes)?t.tournament_prizes:[]),...inauguralPrizewinners],vega_url:"https://www.vegaresults.com/vega/index.php?id=9314&page=standings",result_summary:t.result_summary || "Congratulations to all 14 prizewinners at the Auckland Knights Inaugural Rapid Open 2026. Scores are points out of seven rounds."};
}
