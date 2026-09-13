import FindShell from '../components/FindShell';

// /venues — 장소 찾기
const FindVenues = () => (
  <FindShell
    kind="venue"
    title="촬영 장소 찾기"
    description="스튜디오·한옥·야외 등 촬영 장소를 찾아보세요. 장소만 단독으로 예약할 수도 있습니다."
    emptyHint="아직 등록된 촬영 장소가 없습니다."
  />
);

export default FindVenues;
