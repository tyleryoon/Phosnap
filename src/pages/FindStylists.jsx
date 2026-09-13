import FindShell from '../components/FindShell';

// /stylists — 헤어메이크업 찾기
//
// 화면과 조회는 FindShell 이 한다. 이 파일은 "어떤 유형이고 뭐라고
// 부르는가" 만 정한다. 네 페이지가 모두 같은 모양이다 —
// 한 곳을 고치면 네 곳이 같이 고쳐지게 하려고 이렇게 뒀다.
const FindStylists = () => (
  <FindShell
    kind="stylist"
    title="헤어메이크업 찾기"
    description="촬영 전 헤어·메이크업을 맡길 스타일리스트를 찾아보세요. 헤어메이크업만 단독으로 예약할 수도 있습니다."
    emptyHint="아직 등록된 헤어메이크업 작가가 없습니다."
  />
);

export default FindStylists;
