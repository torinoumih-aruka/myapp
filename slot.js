const symbolWidth = 30;
const symbolHeight = 30;
const offsetWidth = 30;
const offsetHeight = 30;
const REEL_WIDTH = 80; // リールの幅
const REEL_HEIGHT = 80; // リールの高さ
const REEL_SPACING = 10; // リール間の間隔
const LEFT_SPACING = 100; // 左の余白
const TOP_SPACING = 100; // 上の余白
const RATE_LEFT = 380;
const RATE_NUM_LEFT = 440;
const RATE_TOP = 350;
const RATE_SPACING = 30;
const DROP_REEL_FRAME = 15; //リール落下時間(0.5秒)
const MELT_ICE_FRAME = 20; //氷が溶ける時間(0.5秒)
const DROP_RATE_FRAME = 15; //レート落下時間(0.5秒)
const PHASE_INTERVAL = 30; //フェーズとフェーズの間の時間(0.5秒)
const WINLOG_TOP = 15;
const WINLOG_LEFT = 2;
const WINLOG_HEIGHT = 18;
const SYMBOL_FREE = "🆓";
var flameCount = 0;
var logCtl = document.getElementById("debug");
var ctlBet = document.getElementById("bet");
var ctlTotalWin = document.getElementById("totalWin");
var ctlCredit = document.getElementById("credit");
//const REEL_FONT = "bold 48px '游ゴシック', YuGothic, 'ヒラギノ角ゴ Pro W3', 'Hiragino Kaku Gothic Pro', 'メイリオ', Meiryo, 'ＭＳ Ｐゴシック', 'MS PGothic', sans-serif";
const REEL_FONT = "48px 'Apple Color Emoji,arial'";
//const UI_FONT_1 = "bold 14px '游ゴシック', YuGothic, 'ヒラギノ角ゴ Pro W3', 'Hiragino Kaku Gothic Pro', 'メイリオ', Meiryo, 'ＭＳ Ｐゴシック', 'MS PGothic', sans-serif";
const UI_FONT_1 = "14px 'Apple Color Emoji,arial'";

const freeSymbols = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"];//フリースピンのワイルドカードシンボル
const rateTableOrigin = [1,1,2,3,4,5,8,12,18,25,40,75,100,150,200,300,450,900,999,999,999,999,999,999];

var icePar = 0.1;//凍ったリールの出現確率

const sameDeleteRateTable = [
 [0,0, 0, 0, 1,  4, 10,  50, 100]
,[0,0, 0, 0, 2,  8, 20, 100, 200]
,[0,0, 0, 0, 3, 12, 30, 150, 300]
,[0,0, 0, 0, 4, 16, 40, 200, 400]
,[0,0, 0, 1, 5, 20, 50, 250, 500]
,[0,0, 1, 2,10, 40,100, 500,1000]
,[0,0, 2, 4,20, 80,200,1000,2000]
,[0,0, 3, 6,30,120,300,1500,3000]
,[0,0, 5,10,50,200,500,2500,5000]
,[0,0,10,16,80,320,800,4000,8000]];

var rateTable = [];
var winLog = [];

const phaseEnum = {init:1,spin:2,winChk:3,melt:4,drop:5,stop:6};

const winEnum = {collect:1,line:2};
// スロットのキャンバスを取得する
var canvas = document.getElementById("slotMachine");
var ctx = canvas.getContext("2d");

//決定済みリール
var decidedReels = [["🍒","🍰","🍈"],["🍒","🍰","🍈"],["🍒","🍰","🍈"]];

const symbols = ["🍒","🍊","🍉","🍈","🔔","🍭","🍮","🍰","💰","💎","🆓","5️⃣"];
const iceSymbol = "■";

var nextReels = [
				 {symbol:symbols[0],posX:0,posY:0,canDrop:false}
				,{symbol:symbols[1],posX:0,posY:0,canDrop:false}
				,{symbol:symbols[2],posX:0,posY:0,canDrop:false}
				];
var state = {
	reels: [
			[
				 {symbol:symbols[0],speed:0,posX:0,posY:0,iced:false,canMelt:false,sameChecked:false,canDelete:false,canDrop:false}
				,{symbol:symbols[1],speed:0,posX:0,posY:0,iced:false,canMelt:false,sameChecked:false,canDelete:false,canDrop:false}
				,{symbol:symbols[2],speed:0,posX:0,posY:0,iced:false,canMelt:false,sameChecked:false,canDelete:false,canDrop:false}
			],[
				 {symbol:symbols[3],speed:0,posX:0,posY:0,iced:false,canMelt:false,sameChecked:false,canDelete:false,canDrop:false}
				,{symbol:symbols[4],speed:0,posX:0,posY:0,iced:false,canMelt:false,sameChecked:false,canDelete:false,canDrop:false}
				,{symbol:symbols[5],speed:0,posX:0,posY:0,iced:false,canMelt:false,sameChecked:false,canDelete:false,canDrop:false}
			],[
				 {symbol:symbols[6],speed:0,posX:0,posY:0,iced:false,canMelt:false,sameChecked:false,canDelete:false,canDrop:false}
				,{symbol:symbols[7],speed:0,posX:0,posY:0,iced:false,canMelt:false,sameChecked:false,canDelete:false,canDrop:false}
				,{symbol:symbols[8],speed:0,posX:0,posY:0,iced:false,canMelt:false,sameChecked:false,canDelete:false,canDrop:false}
			]
		],
    isSpinning: false,
	phase: phaseEnum.init,
	dropReelFrame: 0,
	meltIcdFrame: 0,
	dropRateFrame: 0,
	intervalFrame: 0,
	
    result: [],
    winLines: [],
    credits: 1000,
    bet: 10
  };
 
 var dropReelAnime = function() {
	 this.dropVector = 0;
	 this.dropAnime = this.onAnimationFrame.bind(this);
	 requestAnimationFrame(this.dropAnime);
 };
 dropReelAnime.prototype.onAnimationFrame = function() {
	 
 };
  
// スロットゲームの初期化を行う関数
function init() {

  // スロットの画像を読み込む
  //loadImage();

  // スロットのボタンを有効化する
  //document.getElementById("spin-button").disabled = false;
  //document.getElementById("bet-input").disabled = false;
  //document.getElementById("max-bet-button").disabled = false;

	let x = 0;
	let y = 0;

	// 各リールの位置を初期化する
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			state.reels[i][j].posX = j * (REEL_WIDTH + REEL_SPACING);
			state.reels[i][j].posY = i * (REEL_HEIGHT + REEL_SPACING);
		}
	}

	for (let k = 0; k < 3; k++) {
		nextReels[k].posX = LEFT_SPACING+REEL_SPACING+(k*(REEL_WIDTH + REEL_SPACING))+(20/*REEL_WIDTH/2*/);
		nextReels[k].posY = REEL_SPACING+0+(60/*REEL_HEIGHT/2*/);
	}
	
	// レートを初期化
	for (let l=0;l<10;l++){
		rateTable.push({symbol:symbols[l],rate:rateTableOrigin[l],canDrop:false,canDelete:false,dropCount:0,rateIndex:l});
	}


	// スロットの状態を描画する
	draw();
}


// スロットをスピンさせる関数
function spin() {
	
	state.phase = phaseEnum.spin;
	
	if(state.phase == phaseEnum.stop){
		return;
	}

  // スロットが既にスピン中の場合は、何もしない
  if (state.isSpinning) {
    return;
  }
  
  let count = 0;

	state.bet = ctlBet.value;
	state.credits = ctlCredit.value;
	state.credits -= state.bet;
  
	writeLog_clear();
	winLog = [];
/*
  // 賭け金が不十分な場合は、何もしない
  if (state.bet > state.credits) {
    alert("賭け金が不足しています。");
    return;
  }
*/
	// スロットをスピン中に設定する
	state.isSpinning = true;

	// スロットのリールごとにスピンを開始する
	state.reels.forEach(function (lines) {
		lines.forEach(function (reel) {
			count++;
			// スピードをランダムに設定する
			if(count!=5){
				reel.speed = Math.floor(Math.random() * 60) + 10;
			}else{
				reel.speed = 85;
			}
		})
	});
	
	// 決定済みリールを設定する
	setDecidedReel();

	// スピンのアニメーションを開始する
	requestAnimationFrame(spinAnimation);
}

/************************************************************
 * ストップ処理
 ************************************************************
**/
function stop() {

	
	if(state.phase == phaseEnum.init){
		return;
	}

	let isAllSpinStop = true; //全リールシャッフルストップフラグ
	let isAllReelStop = false; //全リールストップフラグ
	let isWinCheck = false;
	let winobj;

	// 一旦、チェック済みフラグをすべてfalseにする
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			symbol:state.reels[i][j].sameChecked = false;
		}
	}
	
	// スロットがスピン中でない場合は、何もしない
	if (!state.isSpinning) {
		return;
	}

	state.reels.forEach(function (lines) {
		lines.forEach(function (reel) {
			// リールのスピードを下げていく
			if(reel.speed != 0){
				reel.speed--;
			}
			// リールの絵柄をランダムに設定
			shuffleReel(reel);
			
			// １つでもリールがストップしていなければストップフラグを立てない
			if(reel.speed > 0){
				isAllSpinStop = false;
			}
		})
	})


	drawBG();
	drawUI();
	drawReels();
	
	// 全リールのスピンがストップしていなければ、スピンのアニメーションを開始する
	if(!isAllSpinStop){
		// NEXTリールをランダムに設定
		for(let i = 0;i < nextReels.length;i++){
			shuffleNextReel(i);
		}
		requestAnimationFrame(stop);

	// スピンが終わった時点
	}else if(isAllSpinStop == true && state.phase == phaseEnum.spin){

		//フェーズを役成立チェックへ。
		state.phase = phaseEnum.winChk;
		requestAnimationFrame(stop);

	}else if(isAllSpinStop == true && state.phase == phaseEnum.winChk){

		// 役の成立チェックと計算
		winobj = checkSame();
		state.credits += winobj.payout;
		ctlTotalWin.value = winobj.payout;
		ctlCredit.value = state.credits;

		//freeリールの数字を減らす、リールの消滅、落下処理
		//updateReelsAfterCheckSame(winobj.sameLists);
		
		// 役が成立していない場合は、フェーズをストップへ。
		if(winobj.sameLists.length == 0){
			state.phase = phaseEnum.stop;
		// 役が１つでも成立している場合は、溶ける処理、落下処理を行う。
		}else{
			// 溶かしても良い凍っているリールにフラグを立てる
			updateCanMelt(winobj.sameLists);
			
			// 消滅させても良いリールにフラグを立てる
			updateCanDelete(winobj.sameLists);
			
			// 落下させても良いリールにフラグを立てる
			updateCanDrop();

			// レートテーブルのフラグ(canDelete,canDrop)を更新する
			updateRateInfo();

			//フェーズを溶解に移行
			state.phase = phaseEnum.melt;
		}
		requestAnimationFrame(stop);

		//TODO:一列揃った際のレートの落下処理

	}else if(isAllSpinStop == true && state.phase == phaseEnum.melt){
		
		state.intervalFrame += 1;
		if(state.intervalFrame >= PHASE_INTERVAL){

			// 溶解フェーズのフレームカウントダウン
			state.meltIcdFrame += 1;
			//writeLog("melt:" + state.meltIcdFrame);

			// 溶解フェーズのフレームがゼロになったら、リール落下フェーズへ。
			if(state.meltIcdFrame == MELT_ICE_FRAME){
				state.phase = phaseEnum.drop;
				state.intervalFrame = 0;
			}
		}
		requestAnimationFrame(stop);

	}else if(isAllSpinStop == true && state.phase == phaseEnum.drop){

		state.intervalFrame += 1;
		if(state.intervalFrame >= PHASE_INTERVAL){

			// リール落下のフレームカウントアップ
			if(state.dropReelFrame != DROP_REEL_FRAME){
				state.dropReelFrame += 1;
			}

			// レート落下のフレームカウントアップ
			if(state.dropRateFrame != DROP_RATE_FRAME){
				state.dropRateFrame += 1;
			}

			//writeLog("drop:" + state.dropReelFrame);

			// リール落下フェーズのフレームがゼロになったら、次フェーズを決定する
			if(state.dropReelFrame == DROP_REEL_FRAME && state.dropRateFrame == DROP_RATE_FRAME){
				//state.phase = phaseEnum.stop;
				//state.intervalFrame = 0;

				// リール情報を更新する。また、NEXTリールの更新も行う。
				// その後、次に移行すべきフェーズを取得する。
				state.phase = updateReels();
				state.meltIcdFrame = 0;
				state.intervalFrame = 0;
				state.dropReelFrame = 0;
				//state.dropRateFrame = 0;

			}
		}
		requestAnimationFrame(stop);

	}else if(isAllSpinStop == true && state.phase == phaseEnum.stop){

		state.isSpinning = false;
		//最後にフェーズを初期化する
		state.phase = phaseEnum.init;
		state.meltIcdFrame = 0;
		state.dropReelFrame = 0;
		state.dropRateFrame = 0;
		state.intervalFrame = 0;

		requestAnimationFrame(stop);
		


		//TODO:ここでspin()を呼ぶと、フリースピンができる
		//spin();

		
	}else{

	}

}

function draw() {

	// スロットのキャンバスを取得する
	canvas = document.getElementById("slotMachine");
	ctx = canvas.getContext("2d");

	// スロットマシンの状態をクリアする
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// 背景を描画
	drawBG();
	
	// UIを描画
	drawUI();
	
	// リールを描画
	drawReels();

	// スロットマシンの外枠を描画する
	ctx.strokeStyle = 'black';
	ctx.lineWidth = 2;
	ctx.strokeRect(0, 0, canvas.width, canvas.height);

}

function checkSame() {

	let sameLists = [];

	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {

			let list = [];

			list = checkNextSameSymbol(state.reels[i][j].symbol,j,i,list);

			// 3つ以上同じシンボルが隣接していたら、sameListに登録
			if(list.length > 2){
				sameLists.push({symbol:state.reels[i][j].symbol,sameList:list});
				//TODO:フリーシンボルが含まれていたらカウントしておいて、最後にフリーの数を減らす処理を追加する
			}

			// チェック済みフラグを更新する
			updateSameFlgReels(sameLists);
		}
	}

	//writeLog(sameLists.length);
	
	//獲得した金額と、一致シンボル配列を返却する
	return {payout:checkWin(sameLists,state.bet),sameLists:sameLists}; 

}

// 
function checkNextSameSymbol(targetSymbol,posX,posY,list){

	let sameFlg = false;

	//== チェック対象位置のチェック処理 ==
	// 指定個所が既にチェック済みなら、ゼロを返却
	if(state.reels[posY][posX].sameChecked == true){
		return list;
	}

/*	
	//走査済みなら、ゼロを返却
	if(state.reels[posX][posY].sameOriginPos.X!=-1 || state.reels[posX][posY].sameOriginPos.Y!=-1){
		return 0;
	}
*/

	//チェック対象がfreeシンボルなら、チェックをしない
	for(let i = 0;i < freeSymbols.length;i ++){
		if(targetSymbol == freeSymbols[i] || targetSymbol == SYMBOL_FREE){
			return list;
		}
	}

	// 凍ってないか確認
	if(state.reels[posY][posX].iced == false){

		for(let i = 0;i < 6;i ++){
			// freeシンボルか、targetSymbolとシンボルが一致した場合は+1
			if(state.reels[posY][posX].symbol == freeSymbols[i]){
				list.push({posY,posX});
				sameFlg = true;
				break;
			}
		}

		if(state.reels[posY][posX].symbol == targetSymbol){
			list.push({posY,posX});
			sameFlg = true;
		}
	}

	//チェック済みフラグを立てる
	state.reels[posY][posX].sameChecked = true;
/*
	for(let i = 0;i < 5;i ++){
		// freeシンボルの場合、チェック済みフラグは立てない
		if(state.reels[posX][posY].symbol == freeSymbols[i]){
			state.reels[posX][posY].sameChecked = false;
			break;
		}
	}
*/

	//隣をチェック
	/* [0,0][1,0][2,0]
	 * [0,1][1,1][2,1]
	 * [0,2][1,2][2,2]
	 */
	 
	 // チェック中シンボルと一致しない場合は隣の一致チェックをスキップし返却する
	 if(sameFlg == false){
		return list;
	 }

	// 左上：→↓↘をチェックする
	if(posX == 0 && posY==0){
		list = checkNextSameSymbol(targetSymbol,1,0,list);
		list = checkNextSameSymbol(targetSymbol,0,1,list);
		list = checkNextSameSymbol(targetSymbol,1,1,list);
		return list;
	}

	// 上：←→↓をチェックする
	if(posX == 1 && posY==0){
		list = checkNextSameSymbol(targetSymbol,0,0,list);
		list = checkNextSameSymbol(targetSymbol,2,0,list);
		list = checkNextSameSymbol(targetSymbol,1,1,list);
		return list;
	}

	// 右上：←↓↙をチェックする
	if(posX == 2 && posY==0){
		list = checkNextSameSymbol(targetSymbol,1,0,list);
		list = checkNextSameSymbol(targetSymbol,2,1,list);
		list = checkNextSameSymbol(targetSymbol,1,1,list);
		return list;
	}

	// 左：↑→↓をチェックする
	if(posX == 0 && posY==1){
		list = checkNextSameSymbol(targetSymbol,0,0,list);
		list = checkNextSameSymbol(targetSymbol,1,1,list);
		list = checkNextSameSymbol(targetSymbol,0,2,list);
		return list;
	}

	// 中央：全方向をチェックする
	if(posX == 1 && posY==1){
		list = checkNextSameSymbol(targetSymbol,0,0,list);
		list = checkNextSameSymbol(targetSymbol,1,0,list);
		list = checkNextSameSymbol(targetSymbol,2,0,list);
		list = checkNextSameSymbol(targetSymbol,0,1,list);
		list = checkNextSameSymbol(targetSymbol,2,1,list);
		list = checkNextSameSymbol(targetSymbol,0,2,list);
		list = checkNextSameSymbol(targetSymbol,1,2,list);
		list = checkNextSameSymbol(targetSymbol,2,2,list);
		return list;
	}

	// 右：↑←↓をチェックする
	if(posX == 2 && posY==1){
		list = checkNextSameSymbol(targetSymbol,2,0,list);
		list = checkNextSameSymbol(targetSymbol,1,1,list);
		list = checkNextSameSymbol(targetSymbol,2,2,list);
		return list;
	}

	// 左下：↑→↗をチェックする
	if(posX == 0 && posY==2){
		list = checkNextSameSymbol(targetSymbol,0,1,list);
		list = checkNextSameSymbol(targetSymbol,1,1,list);
		list = checkNextSameSymbol(targetSymbol,1,2,list);
		return list;
	}

	// 下：↑←→をチェックする
	if(posX == 1 && posY==2){
		list = checkNextSameSymbol(targetSymbol,1,1,list);
		list = checkNextSameSymbol(targetSymbol,0,2,list);
		list = checkNextSameSymbol(targetSymbol,2,2,list);
		return list;
	}

	// 下：↑←↖をチェックする
	if(posX == 2 && posY==2){
		list = checkNextSameSymbol(targetSymbol,2,1,list);
		list = checkNextSameSymbol(targetSymbol,1,2,list);
		list = checkNextSameSymbol(targetSymbol,2,2,list);
		return list;
	}

}

// チェック済みフラグを更新する
// ・一致したリール以外のチェック済みフラグをfalseにする
function updateSameFlgReels(lists){
	
	// 一旦、チェック済みフラグをすべてfalseにする
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			symbol:state.reels[i][j].sameChecked = false;
		}
	}
	
	// listに登録されている位置は、チェック済みにする
	lists.forEach(function (list) {
		list.sameList.forEach(function (posList) {

			//チェック済みフラグをtrueにする
			state.reels[posList.posY][posList.posX].sameChecked = true;
			
			//チェック対象がfreeシンボルなら、チェック済みフラグを再度falseにする
			for(let i = 0;i < freeSymbols.length;i ++){
				if(state.reels[posList.posY][posList.posX].symbol == freeSymbols[i]){
					state.reels[posList.posY][posList.posX].sameChecked = false;
				}
			}

			//writeLog(list.length);
		})
	})
}

// 
function checkWin(lists,bet) {
	
	let totalWin = 0;
	let lineCount = 0;
	let collectCount = 0;
	let lineRate = 0;
	let collectRate = 0;
	
	if(lists.length==0){
		return 0;
	}

	// 一致したリールリストから、一列の役が揃ったものを探す
	lists.forEach(function (list) {
			
		lineCount = 0;

		//横一列（上）
		lineCount += checkSameLine(list,0,0,1,0,2,0);
		//横一列（中）
		lineCount += checkSameLine(list,0,1,1,1,2,1);
		//横一列（下）
		lineCount += checkSameLine(list,0,2,1,2,2,2);
		//縦一列（左）
		lineCount += checkSameLine(list,0,0,0,1,0,2);
		//縦一列（中）
		lineCount += checkSameLine(list,1,0,1,1,1,2);
		//縦一列（右）
		lineCount += checkSameLine(list,2,0,2,1,2,2);
		//ななめ（左上から右下）
		lineCount += checkSameLine(list,0,0,1,1,2,2);
		//ななめ（左下から右上）
		lineCount += checkSameLine(list,0,2,1,1,2,0);
		
		// 一列揃った役のレートを取得
		lineRate = getSymbolLineRate(list.symbol);
		//writeLog("【" + list.symbol + "】" + lineCount + " LINE" + "： ×" + (lineRate*lineCount));
		
		// 一列以上揃った場合、役をログに登録
		if(lineCount>0){
			winLog.push({symbol:list.symbol,winType:winEnum.line,rate:lineRate,count:lineCount});
		}
		
		//totalWin += getSymbolLineRate(list.symbol)*lineCount;

		// 隣接した役の数、レートを取得
		collectRate = getSymbolSameRate(list.symbol,list.sameList.length);
		collectCount = list.sameList.length;

		//writeLog("【" + list.symbol + "】" + collectCount + " COLLECT" + "： ×" + collectRate);

		//隣接した役のレートが1以上の場合のみ、ログに登録
		if(collectRate>0){
			winLog.push({symbol:list.symbol,winType:winEnum.collect,rate:collectRate,count:collectCount});
		}
		totalWin += lineRate*lineCount+collectRate;

	})

	writeLog("TOTAL WIN" + "：" + (totalWin * bet));

	//rateTable[i]
	
	return totalWin*bet;
}

// 一列揃ったかチェックする。一列揃っている場合は1を、揃っていない場合は0を返却する。
function checkSameLine(list,chkX1,chkY1,chkX2,chkY2,chkX3,chkY3){

	let lineSames = [false,false,false];
	list.sameList.forEach(function (posList) {
		
		if(posList.posY==chkY1 && posList.posX==chkX1){
			lineSames[0] = true;
		}
		if(posList.posY==chkY2 && posList.posX==chkX2){
			lineSames[1] = true;
		}
		if(posList.posY==chkY3 && posList.posX==chkX3){
			lineSames[2] = true;
		}
	})
	
	if(lineSames[0] == true && lineSames[1] == true && lineSames[2] == true){
		return 1;
	}else{
		return 0;
	}
	
}

// そのシンボルの一列揃った場合のレートを取得する
function getSymbolLineRate(symbol){

	let i=0;
	for(i=0;i<symbols.length;i++){
		if(symbol == symbols[i]){
			return rateTable[i].rate;
		}
	}
}

// そのシンボルの一致数ごとのレートを取得する
function getSymbolSameRate(symbol,sameCount){

	let i=0;
	for(i=0;i<symbols.length;i++){
		if(symbol == symbols[i]){
			return sameDeleteRateTable[i][sameCount-1];
		}
	}	
}


// WIN判定を終えたあと、リールを更新する
// ・３つ以上隣接したリールを削除する
// ・freeリールの数を減らす
// ・凍っているリールを溶かす
// ・リールを落とす
function updateReelsAfterCheckSame(list){
	
	let downCount = 0;
	/*
	list.sameList.forEach(function (posList) {
	})
	*/
	
	//symbol:state.reels[0][1].canDelete = true;

}

function updateCanMelt(lists){
	
	lists.forEach(function (list) {
		list.sameList.forEach(function (posList) {
			
			// 真ん中がリストに入ってたら、全部溶かす
			if(posList.posY==1 && posList.posX==1){
				state.reels[0][0].canMelt = true;
				state.reels[0][1].canMelt = true;
				state.reels[0][2].canMelt = true;
				state.reels[1][0].canMelt = true;
				state.reels[1][2].canMelt = true;
				state.reels[2][0].canMelt = true;
				state.reels[2][1].canMelt = true;
				state.reels[2][2].canMelt = true;
				return;//この場合は処理を終了する
			}else{
				if(posList.posY==0 && posList.posX==0){
					state.reels[0][1].canMelt = true;
					state.reels[1][0].canMelt = true;
					state.reels[1][1].canMelt = true;
				}

				if(posList.posY==0 && posList.posX==1){
					state.reels[0][0].canMelt = true;
					state.reels[0][2].canMelt = true;
					state.reels[1][1].canMelt = true;
				}

				if(posList.posY==0 && posList.posX==2){
					state.reels[0][1].canMelt = true;
					state.reels[1][2].canMelt = true;
					state.reels[1][1].canMelt = true;
				}

				if(posList.posY==1 && posList.posX==0){
					state.reels[0][0].canMelt = true;
					state.reels[2][0].canMelt = true;
					state.reels[1][1].canMelt = true;
				}

				if(posList.posY==1 && posList.posX==2){
					state.reels[0][2].canMelt = true;
					state.reels[2][2].canMelt = true;
					state.reels[1][1].canMelt = true;
				}

				if(posList.posY==2 && posList.posX==0){
					state.reels[1][0].canMelt = true;
					state.reels[2][1].canMelt = true;
					state.reels[1][1].canMelt = true;
				}

				if(posList.posY==2 && posList.posX==1){
					state.reels[2][0].canMelt = true;
					state.reels[2][2].canMelt = true;
					state.reels[1][1].canMelt = true;
				}

				if(posList.posY==2 && posList.posX==2){
					state.reels[1][2].canMelt = true;
					state.reels[2][1].canMelt = true;
					state.reels[1][1].canMelt = true;
				}
			}
		})
	})

}

// 
function updateCanDelete(lists){

	lists.forEach(function (list) {
		list.sameList.forEach(function (posList) {
			state.reels[posList.posY][posList.posX].canDelete = true;
		})
	})
}

function updateCanDrop(){

	for(let y=2;y>=0;y--){
		for(let x=0;x<3;x++){
			if(state.reels[y][x].canDelete == true){
				if(y==0){
					nextReels[x].canDrop = true;
				}else if(y==1){
					nextReels[x].canDrop = true;
					state.reels[y-1][x].canDrop = true;
				}else if(y==2){
					nextReels[x].canDrop = true;
					state.reels[y-1][x].canDrop = true;
					state.reels[y-2][x].canDrop = true;
				}
			}
		}
	}
}

function updateRateInfo(){

	//レートテーブルのcanDeleteフラグを立てる
	for(let i=0;i<winLog.length;i++){
		for(let j=0;j<rateTable.length;j++){
			//列が揃っているシンボルが存在すれば、そのシンボルのレートテーブルのcanDeleteフラグを立てる
			if(winLog[i].winType == winEnum.line && winLog[i].symbol == rateTable[j].symbol){
				rateTable[j].canDelete = true;
			}
		}
	}
	
	let isDrop = false;
	
	//レートテーブルのcanDropフラグを立てる
	for(let k=0;k<rateTable.length;k++){
		if(rateTable[k].canDelete == true){
			isDrop = true;
		}
		
		if(isDrop==true){
			rateTable[k].canDrop = true;
		}
	}

	let cnt=0;

	//レートテーブルの落下数を設定する
	for(let l=0;l<rateTable.length;l++){
		if(rateTable[l].canDelete == true){
			cnt++;
		}

		rateTable[l].dropCount = cnt;
	}

}

// リールの落下処理を行い、リールを更新する。
function updateReels(){
	
	//全てのリールが落ち切ったフラグ
	let isDropEnd = true;
	let isDrop = [false,false,false];

	//溶けたリールについて、icedフラグ,canMeltフラグを更新
	for(let y=2;y>=0;y--){
		for(let x=0;x<3;x++){
			if(state.reels[y][x].canMelt == true){
				state.reels[y][x].iced = false;
				state.reels[y][x].canMelt = false;
			}
		}
	}

	//消去リールについて、シンボルをブランクに更新
	for(let y=2;y>=0;y--){
		for(let x=0;x<3;x++){
			if(state.reels[y][x].canDelete == true){
				state.reels[y][x].symbol = "";
			}
		}
	}

	//落下後のリールに更新（一つ上のリール情報を下リールに設定する
	for(let y=2;y>=0;y--){
		for(let x=0;x<3;x++){
			if(isDrop[x]==false){
				//消去リールを検索
				if(state.reels[y][x].canDelete == true){
					
					//消去リールの１つ上のリール情報を、下に移動させる
					if(y==0){
						state.reels[y][x].symbol = nextReels[x].symbol;
						state.reels[y][x].iced = false;
						state.reels[y][x].canDrop = false;//nextReels[x].canDrop;
						state.reels[y][x].canDelete = false;
						
						//NEXTリールに新しいリールを生成
						shuffleNextReel(x);
						isDrop[x]=true;
					}else if(y==1){

						state.reels[y][x].symbol = state.reels[y-1][x].symbol;
						state.reels[y][x].iced = state.reels[y-1][x].iced;
						state.reels[y][x].canDrop = false;//state.reels[y-1][x].canDrop;
						state.reels[y][x].canDelete =state.reels[y-1][x].canDelete;

						state.reels[y-1][x].symbol = nextReels[x].symbol;
						state.reels[y-1][x].iced = false;
						state.reels[y-1][x].canDrop = false;//nextReels[x].canDrop;
						state.reels[y-1][x].canDelete = false;
						
						//NEXTリールに新しいリールを生成
						shuffleNextReel(x);
						isDrop[x]=true;
					}else if(y==2){
						state.reels[y][x].symbol = state.reels[y-1][x].symbol;
						state.reels[y][x].iced = state.reels[y-1][x].iced;
						state.reels[y][x].canDrop = false;//state.reels[y-1][x].canDrop;
						state.reels[y][x].canDelete =state.reels[y-1][x].canDelete;

						state.reels[y-1][x].symbol = state.reels[y-2][x].symbol;
						state.reels[y-1][x].iced = state.reels[y-2][x].iced;
						state.reels[y-1][x].canDrop = false;//state.reels[y-1][x].canDrop;
						state.reels[y-1][x].canDelete =state.reels[y-2][x].canDelete;

						state.reels[y-2][x].symbol = nextReels[x].symbol;
						state.reels[y-2][x].iced = false;
						state.reels[y-2][x].canDrop = false;//nextReels[x].canDrop;
						state.reels[y-2][x].canDelete = false;
						
						//NEXTリールに新しいリールを生成
						shuffleNextReel(x);
						isDrop[x]=true;
					}
				}
			}
		}
	}

	//すべてのリールが落ち切ったかチェック
	for(let y=2;y>=0;y--){
		for(let x=0;x<3;x++){
			//消去リールが残っている場合
			if(state.reels[y][x].canDelete == true){
				
				// 全てのリールが落ち切ったフラグをOFFにする
				isDropEnd = false;
				break;
			}
		}
	}
	
	// 全てのリールが落ち切っていない場合、フェーズは再びDROPのまま。
	if(isDropEnd == false){
		// 落下フラグの更新を再度行う。
		updateCanDrop();
		return phaseEnum.drop;
	// 全てのリールが落ち切った場合、役の成立チェックフェーズに移行。
	}else{
		return phaseEnum.winChk;
	}
}


// スタートボタン押下直後の状態を描画
function spinAnimation() {

	if(state.phase != phaseEnum.spin){
		return;
	}
	// リールの絵柄をランダムに設定
	state.reels.forEach(function (lines) {
		lines.forEach(function (reel) {
			shuffleReel(reel);
		})
	})

	// NEXTリールをランダムに設定
	for(let i = 0;i < nextReels.length;i++){
		shuffleNextReel(i);
	}
	
	drawBG();
	drawUI();
	drawReels();

	requestAnimationFrame(spinAnimation);
}

// 決定済みリールを設定する
function setDecidedReel(){
	
	for (let y = 0; y < 3; y++) {
		for (let x = 0; x < 3; x++) {
			if(decidedReels[x][y] != ""){

				//リールのシンボルを設定
				state.reels[y][x].symbol = decidedReels[x][y];

				//シャッフルしないよう、スピードをゼロにする
				state.reels[y][x].speed = 0;

			}
		}
	}
}

// リールをシャッフルする
function shuffleReel(reel){
	
	if(reel.speed > 0){
		reel.symbol =  symbols[Math.floor(Math.random() * (symbols.length-5))];
		//reel.symbol =  symbols[Math.floor(Math.random() * (symbols.length-2))];
		reel.iced = Math.random() < icePar; 
		//reel.iced = false;
	}
}

// NEXTリールをシャッフルする
// NEXTリールはリールごとにシンボルを決定する場合があるので、
// 当該処理の中では問答無用でシャッフルしシンボルを決定する。
// シャッフルの要否は呼び出し元で管理する事。
function shuffleNextReel(reelIndex){

	let retry = true;
	let choiceMinusCount = 0;
	let maxSpeed = 0;
	let i = 0;
	
	//縦一列の中にＦは一つまで。全体で１～５シンボルは１つまで。Ｆと１～５が両方存在することはない。
	
	let existsFree = false;//Ｆ存在フラグ
	let existsFreeNum = false;//１～５存在フラグ

	state.reels.forEach(function (lines) {
		lines.forEach(function (reel) {
			
			//メインリールのスピードの合計を取得する
			maxSpeed += reel.speed;

			if(reel.symbol == SYMBOL_FREE){
				existsFree = true;
			}
			
			for(let j = 0;j < freeSymbols.length;j ++){
				if(reel.symbol == freeSymbols[j]){
					existsFreeNum = true;
				}
			}

		})
	})
	
	// １～５シンボルについては処理対象外のNEXTリールに存在しているかもチェックする
	for(i = 0;i < nextReels.length;i++){
		if(reelIndex != i){
			for(let j = 0;j < freeSymbols.length;j ++){
				if(nextReels[i].symbol == freeSymbols[j]){
					existsFreeNum = true;
				}
			}
		}
	}
	
	// １～５シンボルが存在していれば、Ｆと１～５は抽選から外す
	if(existsFreeNum){
		choiceMinusCount = 2;
	// Ｆが存在していれば、１～５のみ抽選から外す
	}else if(existsFree){
		choiceMinusCount = 1;
	}
	
	nextReels[reelIndex].symbol =  symbols[Math.floor(Math.random() * (symbols.length-choiceMinusCount))];
	nextReels[reelIndex].canDrop = false;
}

//リールそのものを描画
function drawReels() {

	// フォントの定義
	ctx.font = REEL_FONT;


	ctx.fillStyle = "white";
	for(let y=0;y<3;y++){
		for(let x=0;x<3;x++){

			


			//リールの描画
			ctx.fillStyle = "white";
			if(state.reels[y][x].canDelete == true){
				ctx.globalAlpha = 1-state.meltIcdFrame/MELT_ICE_FRAME;
			}else{
				ctx.globalAlpha = 1;
			}
			if(state.reels[y][x].canDrop == true){
				ctx.fillText(state.reels[y][x].symbol
						,LEFT_SPACING+REEL_SPACING+state.reels[y][x].posX+(20/*REEL_WIDTH/2*/)
						,TOP_SPACING+REEL_SPACING+state.reels[y][x].posY+(60/*REEL_HEIGHT/2*/)
						+((REEL_HEIGHT+REEL_SPACING)*(state.dropReelFrame/DROP_REEL_FRAME)));
			}else{
				ctx.fillText(state.reels[y][x].symbol
						,LEFT_SPACING+REEL_SPACING+state.reels[y][x].posX+(20/*REEL_WIDTH/2*/)
						,TOP_SPACING+REEL_SPACING+state.reels[y][x].posY+(60/*REEL_HEIGHT/2*/)
						);
			}
			ctx.globalAlpha = 1;

			//凍っている状態なら氷を描画
			if(state.reels[y][x].iced==true){
				ctx.fillStyle = "white";
				if(state.reels[y][x].canMelt==true){
					ctx.globalAlpha = (1-state.meltIcdFrame/MELT_ICE_FRAME)*0.5;
				}else{
					ctx.globalAlpha = 1*0.5;
				}
				if(state.reels[y][x].canDrop == true){
					ctx.fillRect(LEFT_SPACING+REEL_SPACING+state.reels[y][x].posX+2
							,TOP_SPACING+REEL_SPACING+state.reels[y][x].posY+2
							 +((REEL_HEIGHT+REEL_SPACING)*(state.dropReelFrame/DROP_REEL_FRAME))
							,REEL_WIDTH-4
							,REEL_HEIGHT-4);
				}else{
					ctx.fillRect(LEFT_SPACING+REEL_SPACING+state.reels[y][x].posX+2
							,TOP_SPACING+REEL_SPACING+state.reels[y][x].posY+2
							,REEL_WIDTH-4
							,REEL_HEIGHT-4);
				}
			}

			ctx.globalAlpha = 1;
		}
	}

	for(let i = 0;i < 3;i ++){
		if(nextReels[i].canDrop == true){
			ctx.fillText(nextReels[i].symbol
					,nextReels[i].posX
					,nextReels[i].posY
					+((REEL_HEIGHT+REEL_SPACING+10)*(state.dropReelFrame/DROP_REEL_FRAME)));
		}else{
			ctx.fillText(nextReels[i].symbol
					,nextReels[i].posX
					,nextReels[i].posY
					);
		}
	}
}


//落ちていくリールを描画
function drawDownReels() {

	// フォントの定義
	ctx.font = REEL_FONT;
	
	// 氷の描画
	ctx.fillStyle = "steelblue";
	state.reels.forEach(function (lines) {
		lines.forEach(function (reel) {
			if(reel.iced==true){
				ctx.fillRect(LEFT_SPACING+REEL_SPACING+reel.posX+5
						,TOP_SPACING+REEL_SPACING+reel.posY+5
						,REEL_WIDTH-10
						,REEL_HEIGHT-10);
			}
		})
	})

	ctx.fillStyle = "white";
	state.reels.forEach(function (lines) {
		lines.forEach(function (reel) {
			//
			if(reel.canDelete==false){
				ctx.fillText(reel.symbol
						,LEFT_SPACING+REEL_SPACING+reel.posX+(20/*REEL_WIDTH/2*/)
						,TOP_SPACING+REEL_SPACING+reel.posY+(60/*REEL_HEIGHT/2*/));
			}
		})
	})

	for(i = 0;i < 3;i ++){
		ctx.fillText(nextReels[i].symbol
				,nextReels[i].posX
				,nextReels[i].posY);
	}
}

// リールの背景を描画
function drawBG() {

	// キャンバスを初期化
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	//役判定のライン描画
	ctx.strokeStyle = "black";
	ctx.lineWidth = 10;

	//上から横に３本
	ctx.beginPath();
	ctx.moveTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2));
	ctx.lineTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2)+((REEL_WIDTH+REEL_SPACING)*2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2));
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2)+((REEL_HEIGHT+REEL_SPACING)*1));
	ctx.lineTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2)+((REEL_WIDTH+REEL_SPACING)*2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2)+((REEL_HEIGHT+REEL_SPACING)*1));
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2)+((REEL_HEIGHT+REEL_SPACING)*2));
	ctx.lineTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2)+((REEL_WIDTH+REEL_SPACING)*2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2)+((REEL_HEIGHT+REEL_SPACING)*2));
	ctx.stroke();

	//左から縦に３本
	ctx.beginPath();
	ctx.moveTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2));
	ctx.lineTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2)+((REEL_HEIGHT+REEL_SPACING)*2));
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2)+((REEL_WIDTH+REEL_SPACING)*1),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2));
	ctx.lineTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2)+((REEL_WIDTH+REEL_SPACING)*1),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2)+((REEL_HEIGHT+REEL_SPACING)*2));
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2)+((REEL_WIDTH+REEL_SPACING)*2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2));
	ctx.lineTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2)+((REEL_WIDTH+REEL_SPACING)*2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2)+((REEL_HEIGHT+REEL_SPACING)*2));
	ctx.stroke();

	//左上から右下
	ctx.beginPath();
	ctx.moveTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2));
	ctx.lineTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2)+(REEL_WIDTH*2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2)+(REEL_HEIGHT*2));
	ctx.stroke();

	//左下から右上
	ctx.beginPath();
	ctx.moveTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2)+((REEL_HEIGHT+REEL_SPACING)*2));
	ctx.lineTo(LEFT_SPACING+REEL_SPACING+(REEL_WIDTH/2)+((REEL_WIDTH+REEL_SPACING)*2),TOP_SPACING+REEL_SPACING+(REEL_HEIGHT/2));
	ctx.stroke();
	

	//リール背景の描画
	ctx.fillStyle = "midnightblue";
	state.reels.forEach(function (lines) {
		lines.forEach(function (reel) {
			ctx.fillRect(LEFT_SPACING+REEL_SPACING+reel.posX
					,TOP_SPACING+REEL_SPACING+reel.posY
					,REEL_WIDTH
					,REEL_HEIGHT);
		})
	})
	
	//NEXTリール背景の描画
	ctx.fillStyle = "indigo";
	for(i = 0;i < 3;i ++){
		ctx.fillRect(LEFT_SPACING+REEL_SPACING+(i*(REEL_WIDTH + REEL_SPACING))
				,REEL_SPACING+0
				,REEL_WIDTH
				,REEL_HEIGHT);
	}


}

// UIの描画
function drawUI() {

	// フォントの定義
	ctx.font = UI_FONT_1;
	ctx.fillStyle = "black";

	for(let i = 0;i < rateTable.length;i ++){

		ctx.fillText(rateTable[i].symbol+rateTable[i].symbol+rateTable[i].symbol
				,RATE_LEFT
				,RATE_TOP+(i*-1*RATE_SPACING));
	}

	animationUI();
	drawWinLog();
}

function drawWinLog(){
	
	ctx.font = UI_FONT_1;
	ctx.fillStyle = "black";

	for(let i=0;i<winLog.length;i++){
	
		ctx.fillText(winLog[i].symbol 
			+ "" + winLog[i].count
			+ "" + (winLog[i].winType == winEnum.line ? " line" : " collect")
			+ " x " + winLog[i].rate 
			,WINLOG_LEFT
			,WINLOG_TOP+(i*WINLOG_HEIGHT));
		
	}
}

function animationUI() {
	
	ctx.fillStyle = "black";
	for(let i = 0;i < rateTable.length;i ++){
		ctx.fillText("×"
				,RATE_NUM_LEFT
				,RATE_TOP+(i*-1*RATE_SPACING)
				);
	}

	for(let i = 0;i < rateTable.length;i ++){
		if(rateTable[i].canDelete==true && state.phase == phaseEnum.drop){
		}else{
			if(rateTable[i].canDrop==true){
				ctx.fillText(rateTable[i].rate
						,RATE_NUM_LEFT+15
						,RATE_TOP+(i*-1*RATE_SPACING)
						+((RATE_SPACING*rateTable[i].dropCount)*(state.dropRateFrame/DROP_RATE_FRAME)));
			}else{
				ctx.fillText(rateTable[i].rate
						,RATE_NUM_LEFT+15
						,RATE_TOP+(i*-1*RATE_SPACING));
			}
		}
	}
}

//function 

// ログを出力する
function writeLog(val){
	
	logCtl.innerHTML = logCtl.innerHTML + val + "<br>";
}

function writeLog_clear(){
	logCtl.innerHTML = "";
}