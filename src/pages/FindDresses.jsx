import FindShell from '../components/FindShell';

// /dresses — 의상 찾기
//
// 여기 보이는 것은 **의상 벤더가 빌려주는 옷**뿐이다.
// 작가·헤메가 직접 보유한 의상은 그 사람을 예약에 담아야 선택지가 된다
// (그 사람이 현장에 들고 오는 옷이라서). 인수인계 5-22 참고.
const FindDresses = () => (
  <FindShell
    kind="dress"
    title="의상 찾기"
    description="촬영 의상을 대여해주는 업체의 의상입니다. 작가나 헤어메이크업 작가가 직접 보유한 의상은 그분을 예약에 담으면 함께 선택할 수 있습니다."
    emptyHint="아직 등록된 대여 의상이 없습니다."
  />
);

export default FindDresses;
